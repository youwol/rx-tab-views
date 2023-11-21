import {
    BehaviorSubject,
    combineLatest,
    Observable,
    of,
    filter,
    map,
} from 'rxjs'
import { ChildrenLike, VirtualDOM, AnyVirtualDOM } from '@youwol/rx-vdom'

export namespace Tabs {
    export class TabData {
        constructor(
            public readonly id: string,
            public readonly name: string,
        ) {}
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

    export class View implements VirtualDOM<'div'> {
        static defaultOptions: TOptions = {
            headerClass: 'd-flex fv-text-primary fv-bg-background fv-pointer',
            headerStyle: {},
            selectedHeaderClass: 'fv-bg-focus fv-text-on-focus',
            selectedHeaderStyle: {},
            containerClass: 'border flex-grow-1 w-100',
            containerStyle: { 'min-height': '0px' },
        }
        public readonly tag = 'div'
        public readonly state: State
        public readonly children: ChildrenLike

        constructor({
            state,
            contentView,
            headerView,
            options,
            ...rest
        }: {
            state: State
            contentView: (state: State, tabDate: TabData) => AnyVirtualDOM
            headerView: (state: State, tabDate: TabData) => AnyVirtualDOM
            options?: TOptions
            [_key: string]: unknown
        }) {
            Object.assign(this, rest)
            const styling: TOptions = {
                ...View.defaultOptions,
                ...(options || {}),
            }
            this.state = state
            const selectedId$ = this.state.selectedId$.pipe(
                filter((id) => id != undefined),
            )

            const headers$ = {
                source$: this.state.tabsData$,
                vdomMap: (tabs: Array<TabData>) => {
                    return {
                        tag: 'div' as const,
                        class: styling.headerClass,
                        style: styling.headerStyle,
                        children: tabs.map((tabData) => {
                            return {
                                tag: 'div' as const,
                                class: {
                                    source$: selectedId$,
                                    vdomMap: (id: string) => {
                                        return id == tabData.id
                                            ? styling.selectedHeaderClass
                                            : ''
                                    },
                                },
                                style: {
                                    source$: selectedId$,
                                    vdomMap: (id: string) => {
                                        return id == tabData.id
                                            ? styling.selectedHeaderStyle
                                            : {}
                                    },
                                },
                                children: [headerView(state, tabData)],
                                onclick: (ev) => {
                                    ev.stopPropagation()
                                    this.state.selectedId$.next(tabData.id)
                                },
                            }
                        }),
                    }
                },
            }
            const content$ = {
                source$: combineLatest([
                    selectedId$,
                    this.state.tabsData$,
                ]).pipe(
                    map(([id, tabsData]) =>
                        tabsData.find((tab) => tab.id == id),
                    ),
                    filter((tabData) => tabData != undefined),
                ),
                vdomMap: (tabData) => contentView(this.state, tabData),
            }

            this.children = [
                headers$,
                {
                    tag: 'div',
                    class: styling.containerClass,
                    style: styling.containerStyle,
                    children: [content$],
                },
            ]
        }
    }
}
