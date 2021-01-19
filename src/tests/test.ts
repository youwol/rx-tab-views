import { attr$, child$, render } from "@youwol/flux-view"
import { Tabs } from "../index"



test('simple tabs', () => {

    let tabsData = [
        new Tabs.TabData("general", "General"),
        new Tabs.TabData("details", "Details"),
    ]
    let state = new Tabs.State(tabsData)
    let vDOM = new Tabs.View({
        id: 'tab',
        class:'d-flex flex-column h-100',
        state,
        headerView: (state, tab) => ({innerText: tab.name, class:'px-2', id:tab.id}),
        contentView: (state, tab) => ({innerText: `Hello ${tab.name}`, class:'fv-text-primary text-center', id:"content"})
    } as any)

    let div = render(vDOM)
    document.body.appendChild(div)
    let tab = document.getElementById('tab')
    expect(tab).toBeTruthy()
    let content = document.getElementById('content')
    expect(content).toBeTruthy()
    expect(content.innerText).toEqual("Hello General")

    let tabDetail = document.getElementById('details')
    expect(tabDetail).toBeTruthy()
    
    tabDetail.dispatchEvent(new MouseEvent('click', {bubbles:true}))
    content = document.getElementById('content')
    expect(content).toBeTruthy()
    expect(content.innerText).toEqual( 'Hello Details')
})


test('simple with preselection', () => {

    let tabsData = [
        new Tabs.TabData("general", "General"),
        new Tabs.TabData("details", "Details"),
    ]
    let state = new Tabs.State(tabsData, 'details')
    let vDOM = new Tabs.View({
        id: 'tab',
        class:'d-flex flex-column h-100',
        state,
        headerView: (_, tab) => ({innerText: tab.name, class:'px-2', id:tab.id}),
        contentView: (_, tab) => ({innerText: `Hello ${tab.name}`, class:'fv-text-primary text-center', id:"content"})
    } as any)

    let div = render(vDOM)
    document.body.appendChild(div)
    let tab = document.getElementById('tab')
    expect(tab).toBeTruthy()
    let content = document.getElementById('content')
    expect(content).toBeTruthy()
    expect(content.innerText).toEqual("Hello Details")

})