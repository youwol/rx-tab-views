import { VirtualDOM, ChildrenLike, RxAttribute } from '@youwol/rx-vdom'
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
    export type ContentGenerator = (p: {
        tabsState: State
    }) => VirtualDOM<'div'>

    export class Tab {
        public readonly id: string
        public readonly title: string
        public readonly icon: string
        public readonly content: ContentGenerator

        constructor(params: {
            id: string
            title: string
            icon: string
            content: ContentGenerator
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

    const baseStyle = (_disposition: Disposition) => {
        return {
            opacity: '1',
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

    export class View implements VirtualDOM<'div'> {
        static baseClasses = 'fv-bg-background d-flex fv-text-primary'
        static classFactory: Record<Disposition, string> = {
            bottom: `w-100 flex-column fv-border-top-background-alt ${View.baseClasses}`,
            top: `w-100 flex-column fv-border-top-background-alt ${View.baseClasses}`,
            left: `h-100 flex-row fv-border-left-background-alt  fv-border-right-background-alt ${View.baseClasses}`,
            right: `h-100 flex-row fv-border-left-background-alt  fv-border-right-background-alt ${View.baseClasses}`,
        }
        public readonly tag = 'div'
        public readonly state: State
        public readonly class: string
        public readonly children: ChildrenLike
        public readonly styleOptions: StyleOptions

        public readonly onmouseenter = () => {
            if (this.state.viewState$.getValue() == 'collapsed') {
                this.state.viewState$.next('expanded')
            }
        }
        public readonly onmouseleave = () => {
            if (this.state.viewState$.getValue() == 'expanded') {
                this.state.viewState$.next('collapsed')
            }
        }
        public readonly style: RxAttribute<DisplayMode, { [k: string]: string }>

        public readonly placeholder$ = new ReplaySubject<VirtualDOM<'div'>>(1)

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

            const headerView = new HeaderView({
                state: this.state,
                connectedCallback: (e) => {
                    const vDOM = {
                        tag: 'div' as const,
                        style: {
                            source$: this.state.viewState$,
                            vdomMap: (displayMode) => {
                                return displayMode == 'expanded'
                                    ? {
                                          width: `${e.offsetWidth}px`,
                                      }
                                    : { width: '0px' }
                            },
                        },
                    }
                    this.placeholder$.next(vDOM)
                },
            })
            const contentView = new TabContent({ state: this.state })

            this.children = [headerView, contentView]
            if (
                this.state.disposition == 'bottom' ||
                this.state.disposition == 'right'
            ) {
                this.children.reverse()
            }

            this.style = {
                source$: this.state.viewState$,
                vdomMap: (state) => {
                    return {
                        ...styleFactory(this.state.disposition)[state],
                        ...this.styleOptions.wrapper.style,
                    }
                },
            }
        }
    }

    export class TabContent implements VirtualDOM<'div'> {
        public readonly state: State
        public readonly tag = 'div'
        public readonly class: RxAttribute<DisplayMode, string>
        public readonly children: ChildrenLike
        public readonly style = {
            minHeight: '0px',
        }
        constructor(params: { state }) {
            Object.assign(this, params)
            this.class = {
                source$: this.state.viewState$,
                vdomMap: (viewState) => {
                    return viewState == 'collapsed'
                        ? 'd-none'
                        : 'd-block h-100 w-100'
                },
            }
            this.children = this.state.persistTabsView
                ? {
                      policy: 'sync',
                      source$: this.state.tabs$,
                      vdomMap: (tab: Tab) => {
                          return {
                              tag: 'div' as const,
                              class: {
                                  source$: this.state.selected$,
                                  vdomMap: (selected: string) =>
                                      selected == tab.id
                                          ? 'h-100 w-100'
                                          : 'd-none',
                              },
                              children: [
                                  tab.content({
                                      tabsState: this.state,
                                  }),
                              ],
                          }
                      },
                  }
                : [
                      {
                          source$: combineLatest([
                              this.state.viewState$,
                              this.state.selected$,
                              this.state.tabs$,
                          ]),
                          vdomMap: ([viewState, selected, tabs]: [
                              DisplayMode,
                              string,
                              Tab[],
                          ]) => {
                              if (viewState == 'collapsed') {
                                  return { tag: 'div' as const }
                              }
                              const selectedTab = tabs.find(
                                  (tab) => tab.id == selected,
                              )
                              if (!selectedTab) {
                                  return { tag: 'div' as const }
                              }
                              return selectedTab.content({
                                  tabsState: this.state,
                              })
                          },
                      },
                  ]
        }
    }

    export class HeaderView implements VirtualDOM<'div'> {
        static baseClasses = 'd-flex fv-bg-background-alt'
        static classFactory: Record<Disposition, string> = {
            bottom: `w-100 flex-row  fv-border-top-background ${HeaderView.baseClasses}`,
            top: `w-100 flex-row  fv-border-bottom-background ${HeaderView.baseClasses}`,
            left: `h-100 flex-column  fv-border-right-background ${HeaderView.baseClasses}`,
            right: `h-100 flex-column  fv-border-left-background ${HeaderView.baseClasses}`,
        }
        public readonly tag = 'div'
        public readonly class: string
        public readonly state: State
        public readonly children: ChildrenLike
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
                tag: 'div' as const,
                class: {
                    source$: this.state.viewState$,
                    vdomMap: (state) => {
                        return state == 'pined'
                            ? `${baseClasses} fv-text-focus`
                            : baseClasses
                    },
                },
                onclick: () => {
                    this.state.viewState$.getValue() == 'pined'
                        ? this.state.viewState$.next('expanded')
                        : this.state.viewState$.next('pined')
                },
            }
            this.children = {
                policy: 'replace',
                source$: this.state.tabs$,
                vdomMap: (tabs: Tab[]) => {
                    return [
                        pinView,
                        ...tabs.map((tab) => {
                            return new TabHeaderView({
                                ...tab,
                                state: this.state,
                            })
                        }),
                    ]
                },
            }
        }
    }

    export class TabHeaderView implements VirtualDOM<'div'> {
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
        public readonly tag = 'div'
        public readonly state: State
        public readonly style: { [k: string]: string }
        public readonly class: RxAttribute<string, string>
        public readonly id: string
        public readonly title: string
        public readonly icon: string
        public readonly children: ChildrenLike

        public readonly onclick = () => {
            this.state.selected$.next(this.id)
        }
        constructor(params: { state: State; title: string; icon: string }) {
            Object.assign(this, params)
            this.style = {
                ...TabHeaderView.baseStyle,
                ...TabHeaderView.styleFactory[this.state.disposition],
            }
            const baseClass = TabHeaderView.classFactory[this.state.disposition]
            this.class = {
                source$: this.state.selected$,
                vdomMap: (selected) => {
                    return this.id == selected
                        ? `${baseClass} ${
                              TabHeaderView.classFactorySelected[
                                  this.state.disposition
                              ]
                          }`
                        : baseClass
                },
            }
            this.children = [
                {
                    tag: 'div',
                    class: this.icon,
                },
                {
                    tag: 'div',
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
