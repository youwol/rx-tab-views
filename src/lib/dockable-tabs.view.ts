import {
    attr$,
    child$,
    children$,
    childrenWithReplace$,
    Stream$,
    VirtualDOM,
} from '@youwol/flux-view'
import {
    BehaviorSubject,
    combineLatest,
    Observable,
    ReplaySubject,
    Subject,
} from 'rxjs'

export namespace DockableTabs {
    export type Disposition = 'left' | 'bottom' | 'right' | 'top'
    export type DisplayMode = 'pined' | 'expanded' | 'collapsed'

    export class Tab {
        public readonly id: string
        public readonly title: string
        public readonly icon: string
        public readonly content: () => VirtualDOM

        constructor(params: {
            id: string
            title: string
            icon: string
            content: () => VirtualDOM
        }) {
            Object.assign(this, params)
        }
    }

    export class State {
        public readonly disposition: Disposition
        public readonly viewState$: BehaviorSubject<DisplayMode>
        public readonly tabs$: Observable<Tab[]>
        public readonly selected$: Subject<string>
        public readonly persistTabsView: boolean = false
        constructor(params: {
            disposition: Disposition
            viewState$: BehaviorSubject<DisplayMode>
            tabs$: Observable<Tab[]>
            selected$: Subject<string>
            persistTabsView?: boolean
        }) {
            Object.assign(this, params)
        }
    }

    const baseStyle = (disposition: Disposition) => {
        if (disposition == 'bottom' || 'top') {
            return {
                opacity: '1',
            }
        }
        if (disposition == 'left' || 'right') {
            return {
                opacity: '1',
            }
        }
    }

    const styleFactory = (
        disposition: Disposition,
    ): Record<DisplayMode, { [k: string]: string }> => {
        const base = baseStyle(disposition)
        const pined = {
            ...base,
            position: 'static',
        }

        const expandedBase = {
            ...base,
            opacity: '0.95',
            zIndex: '10',
            position: 'absolute',
        }
        const expandedVariable: Record<Disposition, { [k: string]: string }> = {
            bottom: {
                bottom: '0px',
                left: '0px',
            },
            top: {
                bottom: '0px',
                left: '0px',
            },
            left: {
                top: '0px',
                left: '0px',
            },
            right: {
                top: '0px',
                right: '0px',
            },
        }

        const collapsedBase = {
            position: 'static',
        }
        const collapsedVariable: Record<Disposition, { [k: string]: string }> =
            {
                bottom: {
                    height: 'fit-content',
                    minHeight: 'auto',
                    maxHeight: 'auto',
                },
                top: {
                    height: 'fit-content',
                    minHeight: 'auto',
                    maxHeight: 'auto',
                },
                left: {
                    width: 'fit-content',
                    minWidth: 'auto',
                    maxWidth: 'auto',
                },
                right: {
                    width: 'fit-content',
                    minWidth: 'auto',
                    maxWidth: 'auto',
                },
            }
        return {
            pined,
            expanded: { ...expandedBase, ...expandedVariable[disposition] },
            collapsed: { ...collapsedBase, ...collapsedVariable[disposition] },
        }
    }

    export interface StyleOptions {
        initialPanelSize?: string
        wrapper?: {
            style?: { [k: string]: string }
            class?: string
        }
    }
    export function defaultStyleOptions(): StyleOptions {
        return {
            initialPanelSize: '300px',
            wrapper: {
                style: {},
                class: '',
            },
        }
    }

    export class View implements VirtualDOM {
        static baseClasses = 'fv-bg-background d-flex fv-text-primary'
        static classFactory: Record<Disposition, string> = {
            bottom: `w-100 flex-column fv-border-top-background-alt ${View.baseClasses}`,
            top: `w-100 flex-column fv-border-top-background-alt ${View.baseClasses}`,
            left: `h-100 flex-row fv-border-left-background-alt  fv-border-right-background-alt ${View.baseClasses}`,
            right: `h-100 flex-row fv-border-left-background-alt  fv-border-right-background-alt ${View.baseClasses}`,
        }
        public readonly state: State
        public readonly class: string
        public readonly children: VirtualDOM[]
        public readonly styleOptions: StyleOptions

        public readonly onmouseenter = () => {
            if (this.state.viewState$.getValue() == 'collapsed') {
                this.state.viewState$.next('expanded')
            }
        }
        public readonly onmouseleave = () => {
            if (this.state.viewState$.getValue() == 'expanded')
                this.state.viewState$.next('collapsed')
        }
        public readonly style: Stream$<DisplayMode, { [k: string]: string }>

        public readonly placeholder$ = new ReplaySubject<VirtualDOM>(1)

        constructor(params: { state: State; styleOptions?: StyleOptions }) {
            this.state = params.state

            this.styleOptions = {
                ...defaultStyleOptions(),
                ...params.styleOptions,
            }

            this.class = `${View.classFactory[this.state.disposition]} ${
                this.styleOptions.wrapper.class
            }`
            this.styleOptions = defaultStyleOptions()

            let headerView = new HeaderView({
                state: this.state,
                connectedCallback: (e) => {
                    const vDOM = {
                        style: attr$(this.state.viewState$, (displayMode) => {
                            return displayMode == 'expanded'
                                ? {
                                      width: `${e.offsetWidth}px`,
                                  }
                                : { width: '0px' }
                        }),
                    }
                    this.placeholder$.next(vDOM)
                },
            })
            let contentView = new TabContent({ state: this.state })

            this.children = [headerView, contentView]
            if (
                this.state.disposition == 'bottom' ||
                this.state.disposition == 'right'
            )
                this.children.reverse()

            this.style = attr$(this.state.viewState$, (state) => {
                return {
                    ...styleFactory(this.state.disposition)[state],
                    ...this.styleOptions.wrapper.style,
                }
            })
        }
    }

    export class TabContent implements VirtualDOM {
        public readonly state: State
        public readonly class: Stream$<DisplayMode, string>
        public readonly children
        public readonly style = {
            minHeight: '0px',
        }
        constructor(params: { state }) {
            Object.assign(this, params)
            this.class = attr$(this.state.viewState$, (viewState) => {
                return viewState == 'collapsed'
                    ? 'd-none'
                    : 'flex-grow-1 fv-bg-background fv-x-lighter'
            })
            this.children = this.state.persistTabsView
                ? childrenWithReplace$(this.state.tabs$, (tab) => {
                      return {
                          class: attr$(this.state.selected$, (selected) =>
                              selected == tab.id ? 'h-100 w-100' : 'd-none',
                          ),
                          children: [tab.content()],
                      }
                  })
                : [
                      child$(
                          combineLatest([
                              this.state.viewState$,
                              this.state.selected$,
                              this.state.tabs$,
                          ]),
                          ([viewState, selected, tabs]) => {
                              if (viewState == 'collapsed') return {}
                              const selectedTab = tabs.find(
                                  (tab) => tab.id == selected,
                              )
                              if (!selectedTab) return {}
                              return selectedTab.content()
                          },
                      ),
                  ]
        }
    }

    export class HeaderView implements VirtualDOM {
        static baseClasses = 'd-flex fv-bg-background-alt'
        static classFactory: Record<Disposition, string> = {
            bottom: `w-100 flex-row  fv-border-top-background ${HeaderView.baseClasses}`,
            top: `w-100 flex-row  fv-border-bottom-background ${HeaderView.baseClasses}`,
            left: `h-100 flex-column  fv-border-right-background ${HeaderView.baseClasses}`,
            right: `h-100 flex-column  fv-border-left-background ${HeaderView.baseClasses}`,
        }

        public readonly class: string
        public readonly state: State
        public readonly children //: VirtualDOM[]
        public readonly connectedCallback: (element: HTMLDivElement) => void

        constructor(params: {
            state
            connectedCallback: (element: HTMLDivElement) => void
        }) {
            Object.assign(this, params)
            this.class = HeaderView.classFactory[this.state.disposition]
            const baseClasses =
                'p-1 fas fa-thumbtack fv-pointer fv-hover-xx-darker'
            const pinView = {
                class: attr$(this.state.viewState$, (state) => {
                    return state == 'pined'
                        ? `${baseClasses} fv-text-focus`
                        : baseClasses
                }),
                onclick: () => {
                    this.state.viewState$.getValue() == 'pined'
                        ? this.state.viewState$.next('expanded')
                        : this.state.viewState$.next('pined')
                },
            }
            this.children = children$(this.state.tabs$, (tabs: Tab[]) => {
                return [
                    pinView,
                    ...tabs.map((tab) => {
                        return new TabHeaderView({
                            ...tab,
                            state: this.state,
                        }) as VirtualDOM
                    }),
                ]
            })
        }
    }

    export class TabHeaderView implements VirtualDOM {
        static baseClasses =
            'd-flex align-items-center fv-pointer fv-hover-bg-background rounded'
        static classFactory: Record<Disposition, string> = {
            bottom: `flex-row ${TabHeaderView.baseClasses} px-2 mx-1`,
            top: `flex-row ${TabHeaderView.baseClasses} px-2 mx-1`,
            left: `flex-column ${TabHeaderView.baseClasses} py-2 my-1`,
            right: `flex-column ${TabHeaderView.baseClasses} py-2 my-1`,
        }
        static classFactorySelected: Record<Disposition, string> = {
            top: `fv-border-bottom-focus `,
            bottom: `fv-border-top-focus `,
            left: `fv-border-right-focus`,
            right: `fv-border-left-focus`,
        }
        static baseStyle = { borderWidth: '3px' }
        static styleFactory: Record<Disposition, { [k: string]: string }> = {
            bottom: {},
            top: {},
            left: {
                width: 'fit-content',
            },
            right: {
                width: 'fit-content',
            },
        }

        static styleText: Record<Disposition, { [k: string]: string }> = {
            bottom: {},
            top: {},
            left: {
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                transform: 'rotate(180deg)',
            },
            right: {
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
            },
        }
        public readonly state: State
        public readonly style: { [k: string]: string }
        public readonly class: Stream$<string, string>
        public readonly id: string
        public readonly title: string
        public readonly icon: string
        public readonly children: VirtualDOM[]

        public readonly onclick = () => {
            this.state.selected$.next(this.id)
        }
        constructor(params: { state: State; title: string; icon: string }) {
            Object.assign(this, params)
            this.style = {
                ...TabHeaderView.baseStyle,
                ...TabHeaderView.styleFactory[this.state.disposition],
            }
            let baseClass = TabHeaderView.classFactory[this.state.disposition]
            this.class = attr$(this.state.selected$, (selected) => {
                return this.id == selected
                    ? `${baseClass} ${
                          TabHeaderView.classFactorySelected[
                              this.state.disposition
                          ]
                      }`
                    : baseClass
            })
            this.children = [
                {
                    class: this.icon,
                },
                {
                    class:
                        this.state.disposition == 'bottom' ||
                        this.state.disposition == 'top'
                            ? 'ml-2'
                            : 'mt-2',
                    style: TabHeaderView.styleText[this.state.disposition],
                    innerText: this.title,
                },
            ]
        }
    }
}
