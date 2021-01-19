
import { BehaviorSubject, combineLatest, Observable, of, ReplaySubject, Subject } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import { attr$, child$, VirtualDOM} from '@youwol/flux-view'

export namespace Tabs {

    export class TabData {

        constructor(public readonly id: string, public readonly name: string) {
        }
    }

    export class State {

        selectedId$: BehaviorSubject<string>
        tabsData$: Observable<Array<TabData>>

        constructor(
            tabsData: Array<TabData> | Observable<Array<TabData>>,
            selectedId?: BehaviorSubject<string> | string  ) {

            this.tabsData$ = tabsData instanceof Observable ? tabsData : of(tabsData)

            if(!selectedId){
                this.selectedId$ = new BehaviorSubject<string>(undefined)
                this.tabsData$.pipe(
                    filter( tabsData => tabsData.length > 0)
                ).subscribe( () => {
                    this.selectedId$.next(tabsData[0].id) 
                })
                return 
            }
            this.selectedId$ = selectedId  instanceof BehaviorSubject ?  selectedId: new BehaviorSubject(selectedId)
        }
    }

    export let defaultHeaderClass = 'd-flex fv-text-primary fv-bg-background fv-pointer'
    export let defaultContainerClass = 'border flex-grow-1 w-100'
    export let defaultSelectedHeaderClass = 'fv-bg-focus fv-text-on-focus'

    export class View implements VirtualDOM {

        public readonly state: State
        public readonly children: Array<VirtualDOM>
        constructor({
            state,
            contentView,
            headerView,
            ...rest
        }:
        {
            state: State,
            contentView: (state: State, tabDate: TabData) => VirtualDOM,
            headerView: (state: State, tabDate: TabData) => VirtualDOM
        }) {
            Object.assign(this, rest)

            this.state = state
            let selectedId$ = this.state.selectedId$.pipe(filter( id => id != undefined))

            let headers$ = child$( 
                this.state.tabsData$, 
                (tabs: Array<TabData>) => {
                    return {
                        class: defaultHeaderClass,
                        children: tabs.map( (tabData) => {
                            return {
                                class: attr$( 
                                    selectedId$, 
                                    (id:string) => {
                                        return id == tabData.id ? defaultSelectedHeaderClass : "tutu" 
                                    }
                                ),
                                children: [ headerView(state, tabData) ],
                                onclick: (ev) => { ev.stopPropagation(), this.state.selectedId$.next(tabData.id)}
                            }
                        })
                    }
                })
            let content$ = child$( 
                combineLatest([selectedId$, this.state.tabsData$]).pipe(
                    map( ([id, tabsData]) => tabsData.find( tab => tab.id == id)),
                    filter( tabData => tabData != undefined )
                ),
                (tabData) => contentView(this.state, tabData)
            )

            this.children = [
                headers$,
                {
                    class: defaultContainerClass,
                    children: [ content$ ]
                }
            ]
        }
    }
}
