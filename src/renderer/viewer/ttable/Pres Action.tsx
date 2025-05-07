

import React from 'react';

import { observer } from 'mobx-react';

import { Button, ButtonGroup, ControlGroup, Intent, Menu, MenuDivider, MenuItem, Popover, PopoverInteractionKind } from '@blueprintjs/core';

import { TTable, ColData } from './TTable base Obj'
import { TIG, TI } from './table items base'
import { onClickReporter } from './Pres TTPres';

import { v4 as uuidv4 } from 'uuid'

var _ = require('lodash');

const cl = console.log;





export const theClipboard = navigator.clipboard




/*


outline
  current component hierarchy

    react component             state class
    ===============             ==============
    WrappedApp                  App
      TTPresConfig              TTable, TTableConfig
        TTPres                  
          TTControls            
          Table (blueprint)
            CellContent         TI, TTable
              ContentView       TI, TTable

      TTPresCRWithDetail        TTable, TTableCR
        TTPres
          TTControls
          Table (blueprint)
            CellContent         TI, TTable
              ContentView       TI, TTable
        DetailViewListView
          ContentView           TI, TTable


  current action types, where declared and where rendered

    declared in                           type                handler in          rendered in             description
    ===========                           ==========          ===========         ===========             ===========
    WrappedApp (for TTPresConfig)         ttControlsActions   TTableConfig                                Load/Save configs
    WrappedApp (for TTPresConfig)         tableActions      
    WrappedApp (for TTPresConfig)         cellCVActions
    WrappedApp (for TTPresCRWithDetails)  ttControlsActions   TTableCR                                    Load CRs
    WrappedApp (for TTPresCRWithDetails)  tableActions        App                                         Add/Highlight Configs based on selected CRs
    WrappedApp (for TTPresCRWithDetails)  cellCVActions

    TTPresConfig                          ttControlsActions   TTableConfig                                add new config item
    TTPresConfig                          tableActions        TTable                                      undo delta
    TTPresConfig                          tableActions        TTableConfig                                cut/copy/paste etc

    TTPresCRWithDetails                   tableActions        TTable                                      push selected TIs to detail view
    TTPresCRWithDetails                   cellCVActions       TTable                                      push this TI to detail view



 action handler approach
  (not to be confused with the mobx term 'action'))
  an 'action' is typically some thing that needs to be done, triggered by the user clicking a button, hotkey, menu command etc
    more generally, the trigger could be any event (dom event, serviceOp, etc)
  the typical problems with actions are:
    the code that needs to run when the action fires most naturally should be at one level of the component hierarchy,
      but the ui component where the button etc. that triggers it lives at another, lower level
    specific actions may vary in terms of
      where the handler should be, e.g., at the App level, TTable level, etc.
      whether the action handler needs parameters that are specific to the trigger location (e.g., the specific row or cell)
      whether the the action trigger will be a button, menu, hotkey or some combination of those
    we want to re-use some lower-level components across different kinds of parents, e.g., TTPres is used for both Configs and CRs (with and without Detail)
      and the parents will want different kinds of actions available on the child
      and we don't want the child component code to be conditional on who the parent is

  fundamental idea is to standardize the properties of actions, so that
    they can be passed around as arrays and handled by common methods, e.g., TTPres has a single onKeydown hotkey handler that checks a keypress against all actions for a table 
      action declarations all look the same, to make them easier to understand and debug

  every action has
    a handler function - called when user triggers it
    render location - component where gui button/menu is rendered
    hotkey location - component that captures onKeydown and checks for matching actions to fire
    declaration location - where the action properties are declared
  where to declare actions
    in general, as high in the component hierarchy as makes sense
       this will be the level at which the handler method and arguments are known, e.g., the TTable instance is known
    in general, subject to the previous consideration, in as few locations as possible, so they are easy to find/change
    for the most part, this will be at the App or TTPres level
  sets of actions can be trees, which will rendered in a menu hierarchy
  sets of actions are passed down through component hierarchy in props
  types of action (so far, others may emerge over time)
    (note - any of these may also have a hotkey(s) tied to them - the hotkeys are typically captured at the TTPres level)
    TTControls action - rendered in TTControls of a TTPres
    table action - rendered in context menu of a TTPres
    cellCV action - rendered in ContentView of a ti[prop] (which may be in a cell popover or a detail view)
  how arguments are passed to handler functions
    handlers rendered in bottom-level controls must have no arguments - so gui event handler (e.g., onClick) can just call it 
    ttControlsAction and tableAction handlers must be defined with no arguments - if the upstream handler needs arguments, they must be specified where the handler is declared
      usually, the handler only needs to know the TTable for which it was invoked, which is inherently known because the handler
        is defined in a TTable[Config|CR]
      or, the handler acts on a row selection, which is maintained in TTable state
    cellCV action handlers need to be passed the table/column/ti/propname
      this becomes known at the CellContent level of the hierarchy
      so, CellContent needs to convert the cellCV action handler to a 'plain' action handler


  actions need an ID prop, that is unique to each action type, so that methods that 
  need to test for existence of a certain action can identify them (say, to remove that action if a parent passed it in)
*/

export type ActionIds = 
  'ResetSort'
  | 'ClearTTable'
  | 'ToDV'                // add to Detail View panel
  | 'RemoveDV'          // remove item from Detail View panel
  | 'ClosePopover'
  | 'SelectAll'       // change selection to all rows in table
  | 'ClearHighlightLevelMatching'   // clear highlightLevelMatching on all TIs
  | 'OpenTestDialog'    // open test dialog
  | 'NewItem'            // create new config item with default values
  | 'Undo'               // call TTable.undoDelta
  | 'DupSelection'            // duplicate selection item
  | 'DeleteSelection'         // delete selection
  | 'CutSelection'         // cut selection (to pasteBuffer)
  | 'CopySelection'         // copy selection (to pasteBuffer)
  | 'PasteBuffer'         // paste contents of pasteBuffer
  | 'LoadAllCRs'             // load all CRs
  | 'ConfigLoad'         // load ConfigSet from server, after choosing with file picker
  | 'ConfigSaveFileNotes'  // opens dialog to enter notes and save a config file
  | 'ApplyConfigToPiholes'  // applies config currently in TTable to pihole
  | 'PullPiholeLog'      // pull log file from one pihole
  
  | 'CreateConfigIFromCR'   // create new config item based on a CR
  | 'AddConfigFromCRsURLCombined'     // add new config item(s) based on selected CRs
  | 'AddConfigFromCRsURLSeparate'     // with either urlRegexPattern or hostDomainPatterns
  | 'AddConfigFromCRsHostnameCombined' // either as one combined Config or separate configs for each item
  | 'AddConfigFromCRsHostnameSeparate'
  | 'HighlightCRsThatMatchThisConfigI'
  | 'HighlightConfigIsThatMatchThisCR'

  | 'HighlightConfigIsThatMatchThisDomain'
  | 'HighlightInitiatorUrlGs'

  | 'ToggleTTableCRHeaderShowControl'
  | 'RuleTableShow' | 'RuleTableUnShow'
  
  | 'PopupTabReload' | 'PopupGlobalTemp'

  | 'CommitTempRule'
  | 'MergeSelection'    // merge selected TIs
  
  | 'dummy'



export interface ActionPlain {    // 'Plain' means no arguments
  type: 'action'
  id: ActionIds
  label: string
  handler: ()=>void
  isActive: ()=>boolean
  intent: ()=>Intent
  hotkeys: {     // note - may want >1 hotkey for the same action, e.g., ctrl-C and meta-C for copy (for windows and macos respectively)
    key: string  // so, hotkeys is an array
    shiftKey: boolean
    ctrlKey: boolean
    altKey: boolean
    metaKey: boolean
  } []
}

export interface ActionPlainGroup {
  type: 'group'
  label: string  // note: label for a group will be rendered in a Button or MenuItem that corresponds to this group
  children: ActionPlainOrGroup[]
}

export interface ActionSpacer {   // will produce a horizontal gap in a row of buttons, or a divider in a menu
  type: 'spacer'
}

export type ActionPlainOrGroup         = ActionPlain | ActionPlainGroup
export type ActionPlainOrGroupOrSpacer = ActionPlain | ActionPlainGroup | ActionSpacer


export interface ActionCV {  // 'CV' is for ContentView, which is where these actions are typically rendered - other render locations could emerge as we develop further
  type: 'action'
  id: ActionIds
  label: string
  // note: 'actions' argument in handler allows an array of actions to be passed through, e.g., from parent TTable via 'DV' button to a new DetailView
  handler: (table: TTable, ti: TI, col: ColData, actions: ActionPlainOrGroup[])=>void
}

export interface ActionCVGroup {
  type: 'group'
  label: string  // note: label for a group will be rendered in a Button or MenuItem that corresponds to this group
  children: ActionCVOrGroup[]
}

export type ActionCVOrGroup = ActionCV | ActionCVGroup

export interface ActionCellClick {   // actions that will trigger when a TTable Cell is clicked on
  id: ActionIds
  handler: (ti: TI, col: ColData, rowIndex: number)=>void
}

// component to take an ActionPlainOrGroup and render it
// cases:
//   actions.type === 'action'
//      just render a button that calls handler on click
//   actions.type === 'group'
//      render a button in a Popover2
//      on hover, render a menu with actions as the items


function groupIsActive(group: ActionPlainGroup): boolean {
  for (let c of group.children) {
    if (c.type === 'action') if (c.isActive()) return true
    if (c.type === 'group') if (groupIsActive(c)) return true
  }
  return false
}

export const ActionButton = observer((props: { actions: ActionPlainOrGroup }) => {
  if (props.actions.type === 'action') return (
    <Button
      key={props.actions.label}
      text={props.actions.label}
      disabled={props.actions.isActive() === false}
      intent={props.actions.intent()}
      onClick={(ev: React.MouseEvent, a = props.actions as ActionPlain)=>{
        //onClickReporter(ev, 'ContentView', [`handling action ${a.id}`])
        // prevent click event from propagating up to the cell or component that owns this action
        ev.preventDefault()
        ev.stopPropagation()
        a.handler()
      }}
    />
  )
  else return (
    <Popover
      interactionKind={PopoverInteractionKind.HOVER}
      hoverOpenDelay={0}
      hoverCloseDelay={100}
      placement='bottom-start'
      content={
        <ActionMenu group={props.actions.children}/>
      }
    >
      <Button
        key={props.actions.label}
        text={props.actions.label}
        disabled={(groupIsActive(props.actions) === false)}
        rightIcon='caret-down'
        onClick={(ev: React.MouseEvent)=>{
          // prevent click event from propagating up to the cell or component that owns this action
          ev.preventDefault()
          ev.stopPropagation()
        }}
      />
    </Popover>
  )
})

// renders a row of buttons, one for each child of props
export const ActionButtonGroup = observer((props: { actions: ActionPlainOrGroupOrSpacer[] }) => {
  return (
    <ControlGroup key='cg'>
      {props.actions.map((c, i) => {
        return (
          (c.type === 'spacer')
            ? <div key={i} style={{width: '15px'}}/>
            : <ActionButton actions={c} key={i}/>
        )
      })}
    </ControlGroup>
  )
})

// renders a MenuItem, with either a click handler, or children if the prop is a group
const ActionMenuItem = observer((props: { action: ActionPlainOrGroupOrSpacer }) => {
  const a = props.action
  if (a.type === 'action') {
    return (
      <MenuItem
        key={a.label}
        text={a.label}
        intent={a.intent()}
        disabled={a.isActive() === false}
        onClick={(ev: React.MouseEvent) => {
          //onClickReporter(ev, 'ContentView', [`handling action ${a.id}`])
          // prevent click event from propagating up to the cell or component that owns this action
          ev.preventDefault()
          ev.stopPropagation()
          a.handler()
        }}
      />
    )
  }
  else if (a.type === 'group') {
    return (
      <MenuItem
        key={a.label}
        text={a.label}
        children={a.children.map((c,i) => <ActionMenuItem action={c} key={i}/>)}
      />
    )
  }
  else return <MenuDivider key='md'/>
})

// returns a Menu with the children of group
export const ActionMenu = observer((props: { group: ActionPlainOrGroupOrSpacer[] }) => {
  return (
    <Menu
      style={ { borderStyle: 'solid', borderColor: 'blue' } }
    >
      { props.group.map((c,i) => <ActionMenuItem action={c} key={i}/>) }
    </Menu>
  )
})

