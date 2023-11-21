import { render } from '@youwol/rx-vdom'
import { Tabs } from '../index'

test('simple tabs', () => {
    const tabsData = [
        new Tabs.TabData('general', 'General'),
        new Tabs.TabData('details', 'Details'),
    ]
    const state = new Tabs.State(tabsData)
    const vDOM = new Tabs.View({
        id: 'tab',
        class: 'd-flex flex-column h-100',
        state,
        headerView: (state, tab) => ({
            tag: 'div',
            innerText: tab.name,
            class: 'px-2',
            id: tab.id,
        }),
        contentView: (state, tab) => ({
            tag: 'div',
            innerText: `Hello ${tab.name}`,
            class: 'fv-text-primary text-center',
            id: 'content',
        }),
    })

    const div = render(vDOM)
    document.body.appendChild(div)
    const tab = document.getElementById('tab')
    expect(tab).toBeTruthy()
    let content = document.getElementById('content')
    expect(content).toBeTruthy()
    expect(content.innerText).toEqual('Hello General')

    const tabDetail = document.getElementById('details')
    expect(tabDetail).toBeTruthy()

    tabDetail.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    content = document.getElementById('content')
    expect(content).toBeTruthy()
    expect(content.innerText).toEqual('Hello Details')
})

test('simple with preselection', () => {
    const tabsData = [
        new Tabs.TabData('general', 'General'),
        new Tabs.TabData('details', 'Details'),
    ]
    const state = new Tabs.State(tabsData, 'details')
    const vDOM = new Tabs.View({
        id: 'tab',
        class: 'd-flex flex-column h-100',
        state,
        headerView: (_, tab) => ({
            tag: 'div',
            innerText: tab.name,
            class: 'px-2',
            id: tab.id,
        }),
        contentView: (_, tab) => ({
            tag: 'div',
            innerText: `Hello ${tab.name}`,
            class: 'fv-text-primary text-center',
            id: 'content',
        }),
    })

    const div = render(vDOM)
    document.body.appendChild(div)
    const tab = document.getElementById('tab')
    expect(tab).toBeTruthy()
    const content = document.getElementById('content')
    expect(content).toBeTruthy()
    expect(content.innerText).toEqual('Hello Details')
})
