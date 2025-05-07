import * as React from 'react';
import { useState } from 'react';

// import blueprint components
import { Button, ButtonGroup, Dialog, Tooltip } from '@blueprintjs/core';


import { runInAction } from 'mobx';
import { observer } from 'mobx-react'


import '../vwr-App.css';

import { TTableConfig } from './TTableConfig'
import { onKeyDownReporter, TTPres, TTPresProps } from './Pres TTPres'
import { makeMDDisplayStringFromMDRaw } from '../common/configTypesTypes';
import { makeContentViewPropsFromTIProp } from './Pres ContentView';
import { App } from '../vwr-App';

var _ = require('lodash');

const cl = console.log;





export interface TTPresConfigProps extends TTPresProps {
  // override declaration of t to make it specific to TTableConfig
  t: TTableConfig
  // handler for results of edit dialog - we will not update the ttable here because parent may need to do other things as well (e.g., post changes to background script)
}



export const TTPresConfig = observer((props: TTPresConfigProps) => {

  const { t, size, cellCVActions, cellClickAction, cellDoubleClickAction } = props

  const [ selectedFilenameIndex, updateSelectedFilenameIndex ] = useState(0)  // selects first file in list by default
  const [ filenameRegexPattern, updateFilenameRegexPattern ] = useState('')
  const [ filenameRegExp, updateFilenameRegExp ] = useState(new RegExp('.*'))
  const [ saveFileNotes, updateSaveFileNotes ] = useState('')

  // make handlers for 'filePickerCancel' and 'filePickerAccept'
  //   separate functions, since we will tie to both keys and buttons
  
  const filePickerCancel = ()=> {
    t.configFilenameDialogOpen = false
    if (t.configFilenameDialogResolve !== undefined) t.configFilenameDialogResolve(-1)
  }
  const filePickerAccept = ()=> {
    // if nothing selected, do nothing
    if (selectedFilenameIndex !== -1) {
      runInAction(()=>{
        t.configFilenameDialogOpen = false
        if (t.configFilenameDialogResolve !== undefined) t.configFilenameDialogResolve(selectedFilenameIndex)
      })
    }
  }
  const saveNotesCancel = ()=> {
    t.configSaveNotesDialogOpen = false
    if (t.configSaveNotesDialogResolve !== undefined) t.configSaveNotesDialogResolve(undefined)
}
  const saveNotesAccept = () => {
    // do nothing if input is invalid (i.e., keep the dialog open)
    const element: HTMLInputElement = document.getElementById('configFilenameNotes') as HTMLInputElement
    if (element !== null) {
      if (element.checkValidity() === false) return
    }

    runInAction(()=>{
      t.configSaveNotesDialogOpen = false
      t.root.md.notes = saveFileNotes
      // OBSOLETE const parts = splitMDString(t.nonTempSetMD)
      // OBSOLETE if (parts === undefined) throw new Error(`TTableConfig nonTempSetMD invalid: ${t.nonTempSetMD}`)
      // OBSOLETE parts.notes = saveFileNotes
      // OBSOLETE t.nonTempSetMD = makeMDStringFromParts(parts)
      // OBSOLETE t.configFileNotes = saveFileNotes
      if (t.configSaveNotesDialogResolve !== undefined) t.configSaveNotesDialogResolve(saveFileNotes)
    })
  }



  const listOfPiholeHosts: string[] = []
  for (let h in t.parentDnDApp.server.lastServerStateReceived.downstreamHosts) {
    if (t.parentDnDApp.server.lastServerStateReceived.downstreamHosts[h].tools.tool_pihole !== undefined) {
      listOfPiholeHosts.push(h)
    }
  }

  // add actions specific to TTableConfig
  const ttControlsAddedJSX = props.ttControlsAddedJSX.concat()

  const ttControlsActions = props.ttControlsActions.concat()
  if (props.t.serverActive) ttControlsActions.push(
    {
      type: 'spacer',
    },
    {
      type: 'action',
      id: 'ConfigLoad',
      label: 'Load',
      handler: t.selectConfigFileAndLoad,
      isActive: ()=>true,
      intent: ()=>'none',
      hotkeys: []
    },
    {
      type: 'action',
      id: 'ConfigSaveFileNotes',
      label: 'Save',
      handler: ()=>t.saveConfigFile('usingNotesDialog'),
      isActive: ()=>(t.root.md.modified),
      intent: ()=>'none',
      hotkeys: []
    },
    {
      type: 'spacer'
    },
  )

   ttControlsActions.push( {
      type: 'action',
      id: 'NewItem',
      label: 'New Item',
      handler: ()=>t.addNewEmptyItem(),
      isActive: ()=>true,
      intent: ()=>'none',
      hotkeys: []
    },
    {
      type: 'action',
      id: 'Undo',
      label: 'Undo Edit',
      handler: ()=>t.undoDelta(true),
      isActive: ()=>true,
      intent: ()=>'none',
      hotkeys: []
    }
  )

  // button for commit status/actions
  //    three states:
  //      1) server inforce id !== last id pulled from inforce  -- i.e., server inforce changed by something other than this viewer
  //      2) server inforce id === last id pulled from inforce AND this.current..Id === last id pulled -- i.e., this viewer has inforce config set
  //      3) other -- i.e., we changed something in this viewer and not committed yet
  //    tooltip show all 3 ids, for debugging support
  //    button label
  //      1) Commit to Inforce
  //      2) Already Inforce
  //      3) Commit to Inforce
  //    button intent
  //      1) red
  //      2) green
  //      3) blue
  //    button isActive
  //      1) true
  //      2) false
  //      3) true
  ttControlsAddedJSX.push(
    <div key='inforcePullCommitInfo' style= { { display: 'flex', flexDirection: 'column', alignItems: 'self-start' } }>
      <div key='buttons'>
        { (t.serverActive===false) ? <div key='serverButtons'></div> : 
          <ButtonGroup key='serverButtons'>
            <Button
              key='pullinforce'
              intent={
                (t.ifSButtonState === 'table has inforce')
                  ? 'none'
                  : 'primary'
              }
              disabled={t.ifSButtonState === 'table has inforce'}
              onClick={t.pullIfSNonTemp}
            >
              Pull Inforce S
            </Button>
            <Tooltip
              key='inforcetooltip'
              content={
                <div>
                  NON-TEMP CONFIG IDS:
                  {`${(t.ifSButtonState === 'inforce changed since last pull/commit') ? '\nTABLE BEHIND SERVER INFORCE\n' : ''}`}
                  <br/>
                  {`${makeMDDisplayStringFromMDRaw(t.lastNonTempMDPulledFromOrPushedToIfS)} <- last inforce pulled from server`}
                  <br/>
                  {`${makeMDDisplayStringFromMDRaw(t.parentDnDApp.server.lastServerStateReceived.ifSNonTempMD)} <- server current inforce`}
                  <br/>
                  {`${t.root.md.makeMDDisplayString()} <- current table contents`}
                </div>
              }
            >
              <Button
                intent={
                  (t.ifSButtonState === 'inforce changed since last pull/commit')
                    ? 'danger'
                    : (t.ifSButtonState === 'table has inforce')
                      ? 'success'
                      : 'primary'
                }
                // don't disable the button, just make onClick do nothing   disabled={(t.parentDnDApp.server.lastServerStateReceived.inforceNonTempConfigSetID === t.currentNonTempConfigSetId)}
                onClick={()=>{
                  if (t.ifSButtonState !== 'table has inforce') t.commitToIfS()
                }}
              >
                {
                  (t.ifSButtonState === 'table has inforce')
                    ? 'Already Inforce S'
                    : 'Commit to Inforce S'
                }
              </Button>
            </Tooltip>
            <Button
                intent={
                  (t.root.children.filter(c => c.tempItem).length > 0)
                      ? 'primary'
                      : 'none'
                }
                // don't disable the button, just make onClick do nothing   disabled={(t.parentDnDApp.server.lastServerStateReceived.inforceNonTempConfigSetID === t.currentNonTempConfigSetId)}
                onClick={()=>{ t.removeTempItems([])}}
              >
                Remove All Temp
              </Button>
          </ButtonGroup>
        }
        { (t.browserActive===false) ? <div key='browserButtons'></div> : 
          <ButtonGroup key='browserButtons'>
            <Button
              key='pullinforce'
              intent={
                (t.ifBButtonState === 'table has inforce')
                  ? 'none'
                  : 'primary'
              }
              disabled={t.ifBButtonState === 'table has inforce'}
              onClick={()=>t.requestPullIfBConfigSets(true)}
            >
              Pull Inforce B
            </Button>
            <Tooltip
              key='inforcetooltip'
              content={
                <div>
                  NON-TEMP CONFIG IDS:
                  {`${(t.ifBButtonState === 'inforce changed since last pull/commit') ? '\nTABLE BEHIND BROWSER INFORCE\n' : ''}`}
                  <br/>
                  {`${makeMDDisplayStringFromMDRaw(t.lastNonTempMDPulledFromOrPushedToIfB)} <- last inforce pulled from browser`}
                  <br/>
                  {`${makeMDDisplayStringFromMDRaw(t.parentDnDApp.extensionIfBNonTempMD)} <- browser current inforce`}
                  <br/>
                  {`${t.root.md.makeMDDisplayString()} <- current table contents`}
                </div>
              }
            >
              <Button
                intent={
                  (t.ifBButtonState === 'inforce changed since last pull/commit')
                    ? 'danger'
                    : (t.ifBButtonState === 'table has inforce')
                      ? 'success'
                      : 'primary'
                }
                // don't disable the button, just make onClick do nothing   disabled={(t.parentDnDApp.server.lastServerStateReceived.inforceNonTempConfigSetID === t.currentNonTempConfigSetId)}
                onClick={()=>{
                  if (t.ifBButtonState !== 'table has inforce') t.commitIfBConfigSet(true)
                }}
              >
                {
                  (t.ifBButtonState === 'table has inforce')
                    ? 'Already Inforce B'
                    : 'Commit to Inforce B'
                }
              </Button>
            </Tooltip>

          </ButtonGroup>
        }
      </div>
      <div key='tableSetMD' style = { { transform: 'scale(0.75)' } }>{t.root.md.makeMDDisplayString()}</div>
    </div>
  )

  // OBSOLETE ???? if (props.t.browserActive) ttControlsAddedJSX.push(
// OBSOLETE ???? 
  // OBSOLETE ???? )

  const tableActions = props.tableActions.concat([
    {
      type: 'action',
      id: 'Undo',
      label: `Undo`,
      handler: ()=>t.undoDelta(true),
      isActive: ()=>true,
      intent: ()=>'none',
      hotkeys: [ { key: 'z', shiftKey: false, ctrlKey: true,  altKey: false, metaKey: false } ]
    },
    {
      type: 'action',
      id: 'DeleteSelection',
      label: 'Delete Selection (do not put in buffer)',
      handler: t.deleteSelection,
      isActive: ()=>(t.selectionIncludesTempItem === false),
      intent: ()=>'none',
      hotkeys: [ { key: 'Delete', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false } ]
    },
    {
      type: 'action',
      id: 'DupSelection',
      label: 'Duplicate Selected',
      handler: ()=>t.duplicateSelection(),
      isActive: ()=>(t.selectionIncludesTempItem === false),
      intent: ()=>'none',
      hotkeys: []
    },
    {
      type: 'action',
      id: 'CutSelection',
      label: 'Cut Selected',
      handler: ()=>t.cutSelection(),
      isActive: ()=>(t.selectionIncludesTempItem === false),
      intent: ()=>'none',
      // two hotkeys, since macos uses command-X (metaKey in browser event), while windows uses ctrl-X
      hotkeys: [ 
        { key: 'x', shiftKey: false, ctrlKey: true,  altKey: false, metaKey: false }, 
        { key: 'x', shiftKey: false, ctrlKey: false, altKey: false, metaKey: true  } 
      ]
    },
    {
      type: 'action',
      id: 'CopySelection',
      label: 'Copy Selected',
      handler: ()=>t.copySelection(),            
      isActive: ()=>true,
      intent: ()=>'none',
      hotkeys: [ 
        { key: 'c', shiftKey: false, ctrlKey: true,  altKey: false, metaKey: false }, 
        { key: 'c', shiftKey: false, ctrlKey: false, altKey: false, metaKey: true  } 
      ]
    },
    {
      type: 'action',
      id: 'PasteBuffer',
      label: 'Paste',
      handler: ()=>t.pasteConfigIs(),
      isActive: ()=>true,
      intent: ()=>'none',
      hotkeys: [ 
        { key: 'v', shiftKey: false, ctrlKey: true,  altKey: false, metaKey: false }, 
        { key: 'v', shiftKey: false, ctrlKey: false, altKey: false, metaKey: true  } 
      ]
    },
    {
      type: 'action',
      id: 'MergeSelection',
      label: 'Merge/Make NonTemp',
      handler: ()=>t.mergeSelection(),
      isActive: ()=>t.canMergeSelection(),
      intent: ()=>'none',
      hotkeys: []
    },
  ])

  //cl(`rendering TTPresConfig - height: ${size.height.value}`)

  return (
    <div
      style={ {
        height: size.height.value,
        width:  size.width.value,
      }}

      // captures and handles the Enter/Escape keys only if the dialog is open

      // note - tried putting onKeyDown handlers inside the individual Dialogs but 
      // that did not seem to fully work - the Dialog would only see the KeyDown
      // after the <input> element was focused (whereas the handler here sees 
      // the keydowns because the TTableConfig is already focused by virtue of the Load/Save button having been pressed)

      // considered adding useEffect hook and refs to put focus on the <input>
      // conditional on the dialog being open, but didn't try that because
      // this approach seems OK
      //onKeyDownCapture={(ev)=>{cl(ev.eventPhase)}}
      onKeyDown={(ev)=>{
        if (t.configFilenameDialogOpen) {
          if (ev.key === 'Enter') {
            ev.preventDefault()
            ev.stopPropagation()
            filePickerAccept()
          }
          if (ev.key === 'Escape') {
            ev.preventDefault()
            ev.stopPropagation()
            filePickerCancel()
          }
        }
        if (t.configSaveNotesDialogOpen) {
          if (ev.key === 'Enter') {
            ev.preventDefault()
            ev.stopPropagation()
            saveNotesAccept()
          }
          if (ev.key === 'Escape') {
            ev.preventDefault()
            ev.stopPropagation()
            saveNotesCancel()
          }
        }
        onKeyDownReporter(ev, 'TTableConfig dialog', [])
      }}
    >
      <Dialog
        key='filenamechooserdialog'
        style={ { width: '1000px' } }
        isOpen={t.configFilenameDialogOpen}
        onOpening={()=>updateSelectedFilenameIndex(0)}
        className='popupContainer'
      >
        <div 
          key='titleBar'
          className='contentViewTitleBar'
        >
          <div className='contentViewTitleText'>
            titletext
          </div>
          <div className='contentViewButtonBar'>
            <pre key='pre'>Filter Regex Pattern:</pre>
            <input
              id='configFilenamePickerRegexPattern'
              style={ { minHeight: '10px' } }
              value={filenameRegexPattern}
              type='text'
              onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
                // update the input box
                updateFilenameRegexPattern(ev.target.value)
                const element: HTMLInputElement = document.getElementById('configFilenamePickerRegexPattern') as HTMLInputElement
                // if a valid regex pattern, 'setCustomValidity' to valid, update lines.regexPattern (lines.updateMatches will do the rest)
                try {
                  const r = new RegExp(ev.target.value)
                  updateFilenameRegExp(r)
                  if (element !== null) element.setCustomValidity('')
                }
                // if not a valid regex pattern, 'setCustomValidity' to invalid
                catch {
                  if (element !== null) element.setCustomValidity('not a valid regex pattern')
                }
              }}
            />
            <ButtonGroup className='contentViewButtonGroup'>
              <Button
                onClick={()=>filePickerCancel()}
              >
                Cancel
              </Button>
            </ButtonGroup>
          </div>
        </div>
        <div
          key='body'
          className='contentViewBody'
          style={ { 
            maxHeight: '600px',
            maxWidth: '1000px',
            overflow: 'auto',
            overscrollBehavior: 'none' 
          } }
        >
          {t.configFilenameList.map((f, i) => {
            if (filenameRegExp.test(f) === false) return ''
            else {
              // OBSOLETE const parts = f.split('_')
              // OBSOLETE const md = generateSetMDObjFromFilenameString(parts[2])
              
              return (
                <div
                  key={i}
                  style={ { 
                    backgroundColor: (i === selectedFilenameIndex) ? 'blue'  : 'white',
                    color:           (i === selectedFilenameIndex) ? 'white' : 'black'
                  } }
                  onClick={()=> {
                    cl(f)
                    updateSelectedFilenameIndex(i)
                  }}
                  onDoubleClick={(ev) => {
                    ev.preventDefault()
                    ev.stopPropagation()
                    filePickerAccept()
                  }}
                >
                  {f}
                </div>
              )
            }})
          }
        </div>
      </Dialog>
      <Dialog
        key='savenotesdialog'
        onOpened={()=>{
          //const parts = splitMDString(t.nonTempSetMD)
          updateSaveFileNotes(t.root.md.notes)
          const element = document.getElementById('configFilenameNotes')
          if (element !== null) element.focus()
        }}
        isOpen={t.configSaveNotesDialogOpen}
        // OBSOLETE onOpening={()=>updateSaveFileNotes('')}
        className='popupContainer'
      >
        <div
        >
          <div 
            key='top'
            className='contentViewTitleBar'
          >
            <div className='contentViewTitleText'>
              Save NonTemp ConfigSet - Enter Notes
            </div>
            <div className='contentViewButtonBar'>
              <ButtonGroup className='contentViewButtonGroup'>
                <Button
                  onClick={()=>saveNotesCancel()}
                >
                  Cancel
                </Button>
              </ButtonGroup>
            </div>
          </div>
          <div
            key='body'
            className='contentViewBody'
            style={ { 
              width: '600px',
            } }
          >
              <input
                id='configFilenameNotes'
                style={ { minHeight: '10px', width: '100%'} }
                value={saveFileNotes}
                type='text'
                placeholder='only letters, numbers or -'
                pattern='[a-zA-Z0-9\-]*'
                onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
                  // update the input box
                  updateSaveFileNotes(ev.target.value)
                }}
              />

          </div>
        </div>

      </Dialog>
      <div
        key={'config table'}
        style={ {
          height: `${size.height.value}px`,
          width: `${size.width.value}px`
        } }
      >
        <TTPres 
          t={t}
          size={size}
          ttControlsActions={ttControlsActions}
          tableActions={tableActions}
          cellCVActions={cellCVActions}
          cellClickAction={cellClickAction}
          cellDoubleClickAction={cellDoubleClickAction}
          ttControlsAddedJSX={ttControlsAddedJSX}
        />
      </div>
    </div>
  )
  }
)

/* prior JSX
      <TTPresWithDetail
        t={t}
        ttControlsActions = { ttControlsActions }
        tableActions={tableActions}
        cellCVActions ={ cellCVActions }
        cellClickAction={ {
          id: 'HighlightConfigIsThatMatchThisDomain',
          handler: t.highlightConfigIsThatMatchThisDomain
        }}
        totalHt={totalHt}
        totalWd={totalWd}
      />
*/







