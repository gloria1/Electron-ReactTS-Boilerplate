import * as React from 'react';


import { observable, computed, action, makeObservable } from 'mobx'

import { DnDApp } from '../common/commonApp'
import { TIBase, TII, TIG, TI } from './table items base'
import { TTable } from './TTable base Obj'


var _ = require('lodash');

const cl = console.log;

// OBSOLETE ???? export type TestResult = 'Match' | 'No Match'



// Test.result will return boolean
// calls the 'testMethod' provided at construction to get the result
// testMethods are populated in constructor, and usually will come from propMethods
// usually, the testMethod will return (test.equal === regex.text(propValue))
//  i.e., true if (testing for equality) XOR (regex.test returns true)
//  i.e., true if pattern match and equal, or if no pattern match and not-equal


export class Test {
  parent: TestAndGroup
  parentDnDApp: DnDApp
  readonly propName: string   // prop name that this test applies to
      // readonly because we do not want to allow editing this property after creation
  trueIfEqual: boolean
  testMethod: (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIIResultsDisagree: boolean) => boolean
  regex: RegExp
  readonly colTitle: string  // redundant with propName, but this saves us from having to look up the colName
                    // in the presentation component
  highlighted: boolean = false // will be highlighted, if, e.g., it is the source or candidate drop result of a drag

  result = (tii: TIBase, ifChildTIITestResultsDisagree: boolean) => {
    const tipropvalue: string = tii[this.propName]
    // if tii has no value for this prop, return false if this is an equality test, true if it is inequality test
    if (tipropvalue === undefined) return (this.trueIfEqual) ? false : true
    // else xor this.equal with regex.text result
    // OBSOLETE return ((this.trueIfEqual) === (this.regex.test(tipropvalue)))
    return this.testMethod(tipropvalue, this.trueIfEqual, this.regex, ifChildTIITestResultsDisagree)
  }

  constructor(p: TestAndGroup, pa: DnDApp, crProp: string, colTitle: string, trueIfEqual: boolean, regex: RegExp, testMethod: (propValue: string, trueIfEqual: boolean, regex: RegExp, ifChildTIITestResultsDisagree: boolean) => boolean) {
    this.parent = p
    this.parentDnDApp = pa
    this.propName = crProp
    this.colTitle = colTitle
    this.trueIfEqual = trueIfEqual
    this.regex = regex
    this.testMethod = testMethod

    makeObservable(this, {
      parent: observable,
      parentDnDApp: observable,
      propName : observable, 
      trueIfEqual : observable, 
      regex : observable, 
      colTitle : observable, 
      highlighted : observable, 
      deleteThisTest: action.bound,
      dragStart: action.bound,
      dragEnd: action.bound,
    })
  }

  deleteThisTest() {
    this.parent.deleteTest(this)
  }

  dragStart() {
    cl(`DRAG START ACTION`)
    // set testBeingDragged in parent App
    this.parentDnDApp.testBeingDragged = this
    this.parent.dragSourceGroup = true;
    this.highlighted = true
  }

  dragEnd(dropEffect: string) {
    cl(`DRAG END ACTION`)
    // un-set testBeingDragged in parent App
    this.parentDnDApp.testBeingDragged = null
    this.parent.dragSourceGroup = false
    this.highlighted = false
    // if test moved, delete it
    if (dropEffect === 'move') this.parent.deleteTest(this)
  }

}


export class TestAndGroup {
  parent: TestOrGroup
  parentDnDApp: DnDApp
  // will delete @observable showhide: TestAndGroupResult
  tests: Test[] = []
  dragSourceGroup: boolean = false // when drag in progress, this is set to true on group containing the source test,
                            // so that it will never have the drop candidate placed in it
  
  result = (tii: TIBase, ifChildTIITestResultsDisagree: boolean) => {
    // returns false if any test returns false
    for (let t of this.tests) if (t.result(tii, ifChildTIITestResultsDisagree) === false) return false
    return true
  }

  constructor(p: TestOrGroup, pa: DnDApp) {
    this.parent = p
    this.parentDnDApp = pa

    makeObservable(this, {
      parent: observable,
      parentDnDApp: observable,
      tests: observable,
      dragSourceGroup: observable,
      addTest: action.bound,
      deleteTest: action.bound,
      deleteThisGroup: action.bound,
      drop: action.bound,
    })
  }

  // add new test as position pos in tests
  // if pos > tests.length, report an error and do nothing
  addTest(newTest: Test, pos: number) {
    if ((pos < 0) || (pos > this.tests.length)) {
      cl(`tried to add test at position ${pos}, which is greater than tests.length`)
      return;
    }
    newTest.parent = this
    this.tests = [
      ...this.tests.slice(0, pos),
      newTest,
      ...this.tests.slice(pos)
    ]
  }

  // delete test at position pos in tests
  // if pos is out of bounds, report an error and do nothing
  // if pos < 0, take it as an offset from end of tests
  deleteTest(testToDelete: Test) {
    const pos: number = this.tests.findIndex((t: Test) => t===testToDelete)
    this.tests = [
      ...this.tests.slice(0, pos),
      ...this.tests.slice(pos+1)
    ]
  }

  deleteThisGroup() {
    this.parent.deleteAndGroup(this)
  }

  drop(ev: React.DragEvent<HTMLDivElement>) {
    cl(`DROP ACTION, dropEffect: ${ev.dataTransfer.dropEffect}`)

    if (this.parentDnDApp.testBeingDragged !== null) {
      // cannot just add testBeingDragged to this group, since it is a ref
      // to the source test
      // had tried to use _.cloneDeep to make newTest, but this triggered
      // construction of a new TTable for some reason
      const oldTest = this.parentDnDApp.testBeingDragged
      const newTest: Test = new Test(this, this.parentDnDApp, oldTest.propName, oldTest.colTitle, oldTest.trueIfEqual, oldTest.regex, oldTest.testMethod)
      this.addTest(newTest, this.tests.length)
    }
  }
 
}




export class TestOrGroup {
  parent: TTable
  groups: TestAndGroup[] = [];
  
  // ifCantDetermine will be the result if
  //    ti is a group and childrens' results disagree across tests
  //    ti is a group but there are no children (e.g., for an OIG that has not yet been expanded)
  // ifChildTIIResultsDisagree is set passed through to the individual tests
  //   this will be the result of the test for a TI if the prop value contains
  //   multiple items (e.g., for a groupedAsList* prop)
  //   and the individual test's result varies by item
  result = (ti: TIBase, ifCantDetermine: boolean, ifChildTIITestResultsDisagree: boolean) => {
    if (ti.group === 'no') {
      // returns true if any test returns true
      for (let g of this.groups) if (g.result(ti, ifChildTIITestResultsDisagree) === true) return true
      return false
    }
    else {

      // NOTE - IF WE CHANGE THIS LOGIC,
      // THEN ALSO CHANGE LOGIC IN propmethods testMethod for props that can contain multiple items

      let anyTrue: boolean = false
      let allTrue: boolean = true
      // if this is a group but there are no children (e.g., for an OIG that has not yet been expanded)
      // return ifCantDetermine
      if (ti.children.length === 0) return ifCantDetermine
      for (let c of ti.children) {
        if (this.result(c, ifCantDetermine, ifChildTIITestResultsDisagree)) anyTrue = true
        else allTrue = false
      }
      if (allTrue) return true
      else if (anyTrue) return ifCantDetermine
      else return false
    }
  }

  constructor(p: TTable) {
    this.parent = p

    makeObservable(this, {
      parent: observable,
      groups: observable,
      addGroup: action.bound,
      deleteAndGroup: action.bound,
    })
  }
  
  // add new group at position pos in groups
  // if pos > groups.length, report an error and do nothing
  addGroup(newGroup: TestAndGroup, pos: number) {
    if ((pos < 0) || (pos > this.groups.length)) {
      cl(`tried to add group at position ${pos}, which is greater than tests.length`)
      return;
    }
    newGroup.parent = this
    this.groups = [
      ...this.groups.slice(0, pos),
      newGroup,
      ...this.groups.slice(pos)
    ]
  }

  // delete group at position pos in groups
  // if pos is out of bounds, report an error and do nothing
  // if pos < 0, use it as an offset from end of groups
  deleteAndGroup(groupToDelete: TestAndGroup) {
    const pos: number = this.groups.findIndex((g: TestAndGroup) => g===groupToDelete)
    this.groups = [
      ...this.groups.slice(0, pos),
      ...this.groups.slice(pos+1)
    ]
  }



}
