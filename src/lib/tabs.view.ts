import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import { attr$, child$, VirtualDOM } from '@youwol/flux-view'

export namespace Tabs {
    export class TabData {
        constructor(public readonly id: string, public readonly name: string) {}
    }

    export class State {
        selectedId$: BehaviorSubject<string>
        tabsData$: Observable<Array<TabData>>

        constructor(
            tabsData: Array<TabData> | Observable<Array<TabData>>,
            selectedId?: BehaviorSubject<string> | string,
        ) {
            this.tabsData$ =
                tabsData instanceof Observable ? tabsData : of(tabsData)

            if (!selectedId) {
                this.selectedId$ = new BehaviorSubject<string>(undefined)
                this.tabsData$
                    .pipe(filter((tabs) => tabs.length > 0))
                    .subscribe(() => {
                        this.selectedId$.next(tabsData[0].id)
                    })
                return
            }
            this.selectedId$ =
                selectedId instanceof BehaviorSubject
                    ? selectedId
                    : new BehaviorSubject(selectedId)
        }
    }

    type TOptions = {
        headerClass?: string
        headerStyle?: { [key: string]: string }
        selectedHeaderClass?: string
        selectedHeaderStyle?: { [key: string]: string }
        containerClass?: string
        containerStyle?: { [key: string]: string }
    }

    export class View implements VirtualDOM {
        static defaultOptions: TOptions = {
            headerClass: 'd-flex fv-text-primary fv-bg-background fv-pointer',
            headerStyle: {},
            selectedHeaderClass: 'fv-bg-focus fv-text-on-focus',
            selectedHeaderStyle: {},
            containerClass: 'border flex-grow-1 w-100',
            containerStyle: { 'min-height': '0px' },
        }

        public readonly state: State
        public readonly children: Array<VirtualDOM>

        constructor({
            state,
            contentView,
            headerView,
            options,
            ...rest
        }: {
            state: State
            contentView: (state: State, tabDate: TabData) => VirtualDOM
            headerView: (state: State, tabDate: TabData) => VirtualDOM
            options?: TOptions
            [_key: string]: unknown
        }) {
            Object.assign(this, rest)
            let styling: TOptions = {
                ...View.defaultOptions,
                ...(options ? options : {}),
            }
            this.state = state
            let selectedId$ = this.state.selectedId$.pipe(
                filter((id) => id != undefined),
            )

            let headers$ = child$(
                this.state.tabsData$,
                (tabs: Array<TabData>) => {
                    return {
                        class: styling.headerClass,
                        style: styling.headerStyle,
                        children: tabs.map((tabData) => {
                            return {
                                class: attr$(selectedId$, (id: string) => {
                                    return id == tabData.id
                                        ? styling.selectedHeaderClass
                                        : ''
                                }),
                                style: attr$(selectedId$, (id: string) => {
                                    return id == tabData.id
                                        ? styling.selectedHeaderStyle
                                        : {}
                                }),
                                children: [headerView(state, tabData)],
                                onclick: (ev) => {
                                    ev.stopPropagation()
                                    this.state.selectedId$.next(tabData.id)
                                },
                            }
                        }),
                    }
                },
            )
            let content$ = child$(
                combineLatest([selectedId$, this.state.tabsData$]).pipe(
                    map(([id, tabsData]) =>
                        tabsData.find((tab) => tab.id == id),
                    ),
                    filter((tabData) => tabData != undefined),
                ),
                (tabData) => contentView(this.state, tabData),
            )

            this.children = [
                headers$,
                {
                    class: styling.containerClass,
                    style: styling.containerStyle,
                    children: [content$],
                },
            ]
        }
    }
}
