import * as React from 'react';
import { useState } from 'react';

// import blueprint components
import { Icon } from '@blueprintjs/core';

import { observer } from 'mobx-react'

import '../vwr-App.css';

import { Test, TestAndGroup, TestOrGroup } from './test'



var _ = require('lodash');

const cl = console.log;


// ========================================
// react components

const TestBubble = observer((props: {test: Test}) => {
    const { trueIfEqual, regex, colTitle, highlighted, deleteThisTest, dragStart, dragEnd } = props.test
    return (
      <div
        style={ {
          transform: 'scale(0.7)', margin: '0px', padding: '4px', borderRadius: '8px',
          borderColor: 'white', color: 'white',
          backgroundColor: highlighted ? 'red' : 'blue'
        }}

        draggable
        onDragStart={(ev: React.DragEvent<HTMLDivElement>) => {
          ev.dataTransfer.effectAllowed='copyMove'
          dragStart()
        }}
        onDragEnd={ (ev: React.DragEvent<HTMLDivElement>) => {
          //cl(`in TestBubble onDragEnd, dropEffect = ${ev.dataTransfer.dropEffect}`)
          dragEnd(ev.dataTransfer.dropEffect)
        }}


        
      >
        {`${colTitle} ${trueIfEqual ? 'matches' : 'NOT matches'} ${regex}   `}
        <Icon 
          icon='cross' 
          style={ { transform: 'scale(1.0)', color: 'white', backgroundColor: 'gray' } }
          onClick={deleteThisTest}
          // next is to prevent mouse down from starting a drag operation
          // without this, if there is a mousedown, then the cursor moves, it will start a drag
          // operation because the mouse events will bubble up to the parent test element 
          onMouseDown={(ev: React.MouseEvent) => ev.preventDefault()}
        />
      </div>
    );
  })

const TestAndGroupBubble = observer((props: {group: TestAndGroup}) => {
  const { tests, dragSourceGroup, deleteThisGroup, drop } = props.group
  return (
    <div 
      style={ { 
        display: 'inline-flex', alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap',
        margin: '6px', padding: '3px',
        borderRadius: '16px', borderColor: 'white',
        backgroundColor: 'green', color: 'white'
      }}
/* onDragEnter and onDragLeave
IN NEW IMPLEMENTATION, NOTHING NEEDS TO BE DONE ON DRAGENTER OR DRAGLEAVE
SO THESE ARE COMMENTED OUT ENTIRELY
BUT KEEP THEM FOR POSTERITY, AS A RECORD OF HOW WE DETECT
LEAVE/ENTER EVENTS WITHIN THE SAME TESTBOX
      onDragEnter={(ev: React.DragEvent<HTMLDivElement>) => {
        cl(`onDragEnter`)
        cl(`currentTarget: ${ev.currentTarget.id}`)

        // this event fires whenever mouse enters a new element of any kind
        // if it enters a different element within the same testgroup, we do not need to dispatch
        // to redux, so we test whether currentTarget (which is this testGroup) contains the relatedTarget element
        // of the event, and only call the redux handler if not

        if ( ! ev.currentTarget.contains(ev.relatedTarget as Node) )
          if (props.group.dragSourceGroup === false) {
            props.handlers.testGroupDragEnter({targetSid: props.group.sid, ev: ev})}
          }
      }
      onDragLeave={(ev: React.DragEvent<HTMLDivElement>) => {
        cl(`onDragLeave`)
        cl(`currentTarget: ${ev.currentTarget.id}`)

        // similarly to onDragEnter, only dispatch if we have left the testGroup entirely
      if ( ! ev.currentTarget.contains(ev.relatedTarget as Node) )
            props.handlers.testGroupDragLeave({targetSid: props.group.sid, ev: ev})}
      }
  */
      onDrop = {(ev: React.DragEvent<HTMLDivElement>)=> drop(ev)}
      onDragOver = {(ev: React.DragEvent<HTMLDivElement>) => {
        // we don't need any action handler here, because no change needed in store
        // we do need to do two things, though:
        // set dropEffect here, because this event may have bubbled up from a lower-level element
        // with no explicit dragover handler, which causes the default action of setting dropEffect to none
        if (dragSourceGroup) ev.dataTransfer.dropEffect = 'none'
        else if (ev.ctrlKey) ev.dataTransfer.dropEffect = 'copy'
        else ev.dataTransfer.dropEffect = 'move'

        //cl(ev.ctrlKey)
        //cl(ev.dataTransfer.dropEffect)

        // and we need to preventDefault per mdn and whatwg docs
        // if we don't do this, event bubbles to parents, where the default action will be to set dropEffect to 'none'
        ev.preventDefault();
      }}

    >
      {
        tests.map((t: Test, i: number) => 
          <TestBubble
            key={i}
            test={t}
          />)
      }
      <Icon 
        icon='cross' 
        style={ { transform: 'scale(1.0)', color: 'white', backgroundColor: 'gray' } } 
        onClick={deleteThisGroup}
        // next is to prevent mouse down from starting a drag operation
        // see notes above in Test Icon element
        onMouseDown={(ev: React.MouseEvent) => ev.preventDefault()}
      />
      </div>
  )
})

export const TestOrGroupBox = observer((props: { testGroup: TestOrGroup, sizingStyle: React.CSSProperties, title: string}) => {
  const { testGroup, sizingStyle, title } = props
  return (
  <div style={ { ...sizingStyle, overflow: 'auto', display: 'inline-flex', flexDirection: 'row', flexWrap: 'wrap' } }>
    {title}
    {
      testGroup.groups.map((t: TestAndGroup, i: number) => 
        <TestAndGroupBubble
          key={i}
          group={t} 
        />)
    }
  </div>
)
})

