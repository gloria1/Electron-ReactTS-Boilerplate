import * as React from 'react';
import { useState } from 'react';

// import blueprint components
import { Button, ButtonGroup, Dialog, RadioGroup, Radio, Label, FormGroup, ControlGroup, InputGroup, TextArea, Icon, Tooltip } from '@blueprintjs/core';

import { observer } from 'mobx-react'

import { v4 as uuidv4 } from 'uuid'

import '../vwr-App.css';

import { TestGroupTypes } from './TTable base Obj'
import { onKeyDownReporter } from './Pres TTPres';



var _ = require('lodash');

const cl = console.log;



// add regex escape character where necessary, so that each item becomes a RegExp pattern
// that will match item (replace pattern per https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
// 'fullMatch' means make a regex with anchors, so 'text' must match entire string
function convertPlainTextToRegexText(text: string, fullMatch: boolean) {
  text = text.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')
  if (fullMatch) text = '^'+text+'$'
  return text
}




// this will appear as a radio in the dialog
// options is the list of possible choices
// chosenValue is the currently active choice - it must be one of the choices[].values
export type EditDialogRadio = {
  options : {
    value: any,
    label: string
  } []
  chosenValue: any
  // events will always pass a string in currentTarget.value - this function will convert that value if options.value is a non-string type
  eventValueConverter: (evValue: any) => any
}



export type DialogDataItem = {
  label: string
  value: string
}

type DialogData = {
  items: DialogDataItem[]
  regexMode: 'plain' | 'regex'
  multiMode: 'single' | 'multi'
}

export type EditDialogProps = {
  open: boolean
  initialRegexMode: 'plain' | 'regex'
  autoConvertToRegex: boolean   // if true, and regexMode is 'plain' on close, automatically convert data to regex patterns
  initialMultiMode: 'single' | 'multi'  // 'single' means only first item of initialData is handled, and displayed as a TextArea
                                      // 'multi' means each item of initialData is handled, and displayed as an InputGroup with its propname
  optionsRadios: EditDialogRadio[]
  // will be used to populate textarea text,
  // if the local state data is empty
  // note: data is set to empty at construction, and when dialog closes
  initialData: DialogDataItem[]
  commitButtonText: string   // label that appears in the button that commits the result
  // will be called on close (whether accepted or cancelled)
  // dialog just passes back new test results
  // parent is responsible for creating tests or whatever else needs to happen
  closeHandlerFromParent: (accepted: boolean, radios: EditDialogRadio[], data: DialogDataItem[])=>void 
}


export const EditDialog = observer((props: EditDialogProps) => {
  const [ data, dataUpdater ] = useState<DialogData>({
    items: [],
    regexMode: props.initialRegexMode,
    multiMode: props.initialMultiMode 
  })
  const [ radios, radiosUpdater ] = useState(props.optionsRadios)

  const idPrefix = 'EditDialogInput_'

  const onClose = (accepted: boolean)=>{
    // convert text to regexes if not already in regex mode and autoConvertToRegex is true
    let itemsToReturn = data.items
    if (props.autoConvertToRegex && (data.regexMode==='plain')) itemsToReturn = itemsToReturn.map(i => {return {label: i.label, value: convertPlainTextToRegexText(i.value, ((radios[2].chosenValue === 'is')||(radios[2].chosenValue==='isNot')))}})
    props.closeHandlerFromParent(accepted, radios, itemsToReturn)
    // reset mode to 'plain' and text to '' so that on the next open, text will populate with props.initialText
    dataUpdater({items: [], regexMode: 'plain', multiMode: 'single'})
  }

  function splitData(item: DialogDataItem): DialogDataItem[] {
    let value = item.value
    if (value[value.length-1] === '\n') value = value.slice(0, value.length-1)
    return value.split('\n').map( (d,i) => { return { label: i.toString(), value: d } } )
  }


  // prepare to render dialog
  // if we are open, and data.items is empty, populate with props.initialData
  // this can happen in two cases:
  //    1) we had been closed (because onClose sets data.items to []), so we are now re-opening with new initialData
  //    2) the user deleted everything in data.items, in which case this will reset to initialData (not necessarily the most desirable, but not harmful)
  if ((props.open) && (data.items.length === 0)) {
    if (props.initialMultiMode === 'single') dataUpdater({
      items: [props.initialData[0]],
      regexMode: props.initialRegexMode,
      multiMode: 'single'
    })
    else dataUpdater({
      items: props.initialData,
      regexMode: props.initialRegexMode,
      multiMode: 'multi'
    })
  }

  // clone state variables for modification in event handlers, since we should not modify state directly
  let newRadios = _.cloneDeep(radios)
  let newData: DialogData = _.cloneDeep(data)

  return (
    <Dialog
      isOpen={props.open}
      className='popupContainer'
      onClose={()=>onClose(false)}  // this onClose fires if user clicks outside dialog or hits escape
      canOutsideClickClose={false}
      onOpened={()=>document.getElementById(idPrefix+'0')?.focus()}
    >
      <FormGroup style={ { alignItems: 'center', marginBottom: '0px' } } className='colorDialogBar' inline={true} label='Test Create'>
        <ControlGroup style={{flex: 'none'}} fill={false} vertical={false}>
          { radios.map( (r, i) => 
              <RadioGroup
                className='padding_left_40px'
                key={i}
                onChange={
                  (ev: React.FormEvent<HTMLInputElement>)=>{ 
                    newRadios[i].chosenValue = r.eventValueConverter(ev.currentTarget.value); radiosUpdater(newRadios) 
                  }
                }
                selectedValue={r.chosenValue}
              >
                {r.options.map(ro =><Radio tabIndex={-1} label={ro.label} key={ro.label} value={ro.value}/>)}
              </RadioGroup>   
          )}
        </ControlGroup>
      </FormGroup>
      <ControlGroup fill={true} vertical={true}>
        <div style={{marginBottom: '6px', marginTop: '6px'}}>
          {(data.regexMode === 'plain')
            ? <Tooltip content={'Value in textarea will be converted to pattern for RegExp constructor\nby escaping chars that would be regex control chars\n\nClick "Convert to Regex" button to edit regex pattern directly'}>PLAIN TEXT</Tooltip>
            : <Tooltip content={'Value in textarea will be passed to RegExp constructor'}>REGEX CONSTRUCTOR PATTERNS</Tooltip>
          }
        </div>

        { (data.multiMode === 'single')
          ? <TextArea
              id={idPrefix+'0'}
              growVertically={true}
              fill={true}
              value={(data.items.length > 0) ? data.items[0].value : ''}
              onChange={ev=>{ newData.items[0].value = ev.target.value; dataUpdater(newData)}}
            />
          : data.items.map(
           (d,i) => 
            <ControlGroup style={{alignItems: 'center'}} fill={true} vertical={false}>
              <Tooltip className='width_fixed_100px padding_left_6px' content={d.label}>{d.label}</Tooltip>
              <InputGroup 
                style={{marginBottom: '3px'}}
                id={idPrefix+i.toString()}
                fill={true}
                rightElement={
                  <Button className='scale_0p7' icon='cross' tabIndex={-1} onClick={(ev: React.MouseEvent)=>{
                    document.getElementById('EditDialogInputId_0')?.focus()
                    ev.stopPropagation()
                    newData.items.splice(i, 1)
                    dataUpdater(newData) 
                  }} />
                }
                onChange={(ev: React.ChangeEvent<HTMLInputElement>)=>{
                   newData.items[i].value=ev.target.value;
                    dataUpdater(newData)
                  }
                }
                value={d.value}
                onKeyDown={ev=>{
                  const hi: string[] = []
                  if (ev.key==='Tab') {
                    let nextIndex = Number.parseInt(ev.currentTarget.id.slice(idPrefix.length))
                    if (ev.shiftKey) { nextIndex--; if (nextIndex < 0) nextIndex=data.items.length-1 }
                    else { nextIndex++; if (nextIndex === data.items.length) nextIndex = 0 }
                    const nextElement = document.getElementById(idPrefix+nextIndex.toString())
                    if (nextElement !== null) nextElement.focus()
                    ev.preventDefault()
                    hi.push('changing focus')
                  }
                  onKeyDownReporter(ev, 'Dialog', hi)
                }}
              />
            </ControlGroup>
          )
        }
      </ControlGroup>
      <ControlGroup className='colorDialogBar' fill={false} vertical={false}>
        <ButtonGroup className='contentViewButtonGroup'>
          <Button tabIndex={-1} onClick={()=>onClose(true)}>
            {props.commitButtonText}
          </Button>
        </ButtonGroup>
        <ButtonGroup className='contentViewButtonGroup'>
          <Button disabled={(data.multiMode!=='single') || (data.regexMode !== 'plain')} tabIndex={-1} onClick={()=>{
              dataUpdater({items: splitData(data.items[0]), regexMode: data.regexMode, multiMode: 'multi'})
              document.getElementById(idPrefix+'0')?.focus()
            }}
          >
            <span>Split on \n</span>
          </Button>
        </ButtonGroup>
        <ButtonGroup className='contentViewButtonGroup'>
          <Button disabled={data.regexMode!=='plain'} tabIndex={-1} 
            onClick={()=>{
              dataUpdater({
                items: newData.items.map(i => {return {label: i.label, value: convertPlainTextToRegexText(i.value, ((radios[2].chosenValue==='is')||(radios[2].chosenValue==='isNot')))}}),
                regexMode: 'regex',
                multiMode: newData.multiMode
              })
              const q = 1   // no-op to set breakpoint
            }}
          >
            <span>Convert To Regex</span>
          </Button>
        </ButtonGroup>
        <ButtonGroup className='contentViewButtonGroup'>
          <Button tabIndex={-1} onClick={()=>onClose(false)}>
            Cancel
          </Button>
        </ButtonGroup>
      </ControlGroup>


    </Dialog>
  )
})


