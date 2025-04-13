
import { KindsG, KindsI, Kinds } from '../common/commonAll'
import { getCRUniquePropChain, getCRKindChain, HierFlat } from '../common/commonApp'
import { TI, TII, TIG } from './table items base'
import { TTable } from './TTable base Obj'

const cl = console.log;



export type TIH = TIHI | TIHG

export abstract class TIHI extends TII {
  readonly groupingProps: { [index: string]: string } = {}   // populated when 'populate' is called
                                                          // this is a copy of the values of props needed for grouping
                                                          // for TIHI, this is redundant to the original prop values, but this object exists
                                                          // to be parallel to TIHG - see below
  hier: HierFlat
  constructor(kind: KindsI, parentTTable: TTable, hier: HierFlat) {
    super(kind, parentTTable)
    this.hier = hier
 }

  // overrides TII populate, to also populate groupingProps
  populate(item: {[index:string]:any}) {
    super.populate(item)
    for (let p of getCRUniquePropChain(this.hier, this.kind)) this.groupingProps[p] = item[p]
    // catch incoming TI's that have non-existent or improper kinds per crHierarchy
    if ( !this.hier.hasOwnProperty(this.kind)) throw new Error(`TRIED TO CONSTRUCT NEW TIHI WITH INVALID KIND PROPERTY`)
    if ( this.hier[this.kind].childKinds.length !== 0) throw new Error(`TRIED TO CONSTRUCT NEW TIHI WITH INVALID KIND PROPERTY`)
  }

  // returns true if
  //    kinds match
  //    other matches on uniqueProps match on names and values
  match(other: TIH): boolean {
    if (this.kind !== other.kind) return false
    for (let p in this.groupingProps) if (this[p] !== other[p]) return false
    return true
  }

}

export abstract class TIHG extends TIG {
  readonly children: TIH[] = []
  readonly groupingProps: { [index: string]: string } = {}  // will be populated in addChildOrMerge
                                              // these are copies of the values of props used for grouping
                                              // the purpose is so that canMergeWithOrOwn does not need to access the main prop values
                                              // which triggers a re-compute of computed group props, which in turn triggers re-computation of
                                              // testResults for those props that are genericGroupedAs*
                                              // this gets really expensive because canMergeWithOrOwn is the inner-most loop during crDataUpdate
                                              // and every CR that gets added causes CR.testResults to need to be re-computed
                                              // but, for groupingProps, they are guaranteed to always have a single, fixed value, by the nature of how TIHGs are constructed
                                              // so we can make a copy of the value in groupingProps once, and never need to re-compute it
  hier: HierFlat
  
  constructor(kind: KindsG, parentTTable: TTable, hier: HierFlat) {
    super(kind, parentTTable)
    this.hier = hier
/* appears to be unecessary, childred are made observable in TIG constructor
    makeObservable(this, {
      children: observable.shallow,
    })
*/
  }
  
  // returns true if
  //    kinds match
  //    other matches on uniqueProps match on names and values
  match(other: TIH): boolean {
    if (this.kind !== other.kind) return false
    for (let p in this.groupingProps) if (this[p] !== other[p]) return false
    return true
  }

  // return true if other can 
  //   (a) be a direct or indirect child of this
  //   OR (b) can be merged with this
  // validations and conditions
  //  if this is empty
  //    other must be same as or below this in kind chain
  //  if this is not empty
  //    other must be same as or below this in kind chain
  //    groupingPropName values must match
  canMergeWithOrOwn(other: TIH): boolean {
    // if this is root group, return true
    if (this.kind === 'rootG') return true
    // put most specific tests first, to get mismatch fastest
    // only check for matching props if this has children
    if (this.children.length !== 0) {
      for (let p in this.groupingProps) if (this.groupingProps[p] !== other.groupingProps[p]) return false
    }
    if (getCRKindChain(this.hier, this.kind, other.kind).length === 0) return false
    return true
  }

  // takes other TIH and adds it to this
  // other can be TIHI or TIHG
  // other can be same kind as, or a kind that can be owned by, this
  // other's grouping props must match this's - returns false if they do not
  // if other is same kind AND grouping props match, merge other.children into this.children
  // if other is direct child, add it
  // if other is indirect child, will construct intermediate CRGs as needed 
  // returns false if could not add
  addChildOrMerge(other: TIH, tihgConstructor: new(kind: KindsG, parentTTable: TTable | undefined, changeTracking: boolean)=>TIHG ): boolean {
    //cl(`starting TIH.add for ${this.kind}, other is ${other.kind}`)
    let returnValue: boolean = false
    if (this.canMergeWithOrOwn(other)) {
      const kindChain: Kinds[] = getCRKindChain(this.hier, this.kind, other.kind)
      switch (kindChain.length) {
        case 0: // should never happen, would have failed canMergeWithOrOwn test earlier
          break;
        case 1:  // other is same kind as this
          if (other.group === 'no') throw new Error(`CRG TRIED TO MERGE ${other} BUT IT IS NOT A GROUP`)
          // add each of other.children to this - these should never fail, throw error if one does
          else for (let c of other.children) if(!this.addChildOrMerge(c, tihgConstructor)) throw new Error(`CRG ADD METHOD FAILURE`)
          returnValue = true
          break
        case 2:  // other is direct child of this
          if (other.group === 'no') {
            this.addDirectChild(other)
            returnValue = true
          }
          else {
            // loop over this.children trying to add
            // loop in reverse order, to try most recently added child first
            if (this.children.length > 0) for (let i = this.children.length-1; i>=0; i--) {
              if (this.children[i].addChildOrMerge(other)) {
                returnValue = true
              }
            }
            // else append other to this.children
            else {
              this.addDirectChild(other)
              returnValue = true
            }
          }
          break
        default: // other is indirect child of this
          // find lowest child that can own
          let lowestMatchingTIHG: TIHG = this
          let candidateChild: TIH
          let matchedAChildTIHG: boolean
          do {
            // set loop ending flag to false
            matchedAChildTIHG = false
            // loop over children in reverse order, to try most recently added children first
            if (lowestMatchingTIHG.children.length > 0) for (let i = lowestMatchingTIHG.children.length-1; i>=0; i--) {
              candidateChild = lowestMatchingTIHG.children[i]
              // if candidateChild is a CRI...
              if (candidateChild.group === 'no') {
                // ... and it matches other, break out of both loops
                if (candidateChild.match(other)) {
                  matchedAChildTIHG = false
                  break
                }
                // ... if it does not match other, continue checking children
                else continue
              }
              // else candidateChild is a group, so
              // if candidateChild can own other, set lowestMatchingCRG to it
              // set matchedAChildCRG, and break out of inner loop,
              // so outer loop can resume at the next lower level
              else if (candidateChild.canMergeWithOrOwn(other)) {
                matchedAChildTIHG = true
                lowestMatchingTIHG = candidateChild
                break;
              }            
            }
          } while(matchedAChildTIHG)

          // cases:
          //  lowestMatchingCRG same level as other - just add other
          //  lowestMatchingCRG direct parent of other - just add other
          //  lowestMatchingCRG indirect parent - create intermediate CRG chain as needed and add
          const kindChainLower = getCRKindChain(this.hier, lowestMatchingTIHG.kind, other.kind)
          switch (kindChainLower.length) {
            case 0: // should never happen, throw error
              throw new Error(`CRG ADD FUNCTION TRIED TO ADD INDIRECT CHILD BUT REACHED lowestMatchingCRG ON SAME LEVEL AS OTHER`)
              break
            case 1:
            case 2:
              returnValue = lowestMatchingTIHG.addChildOrMerge(other, tihgConstructor)
              break
            default: // need to build intermediate CRGs, building up from other
              let newDirectParentTIHGKind: KindsG | undefined
              let newDirectParent: TIHG
              let newDirectChild: TIH = other
              // we know that other's parent is at least one level below this,
              // so can use a do..while loop that will execute at least once
              do {
                newDirectParentTIHGKind = this.hier[newDirectChild.kind].parentKind
                if (newDirectParentTIHGKind === undefined) throw new Error(`CRG ADD FUNCTION TRYING TO CREATE NEW CRG FOR CHILD THAT HAS NO PARENT KIND`)
                newDirectParent = new tihgConstructor(newDirectParentTIHGKind, this.parentTTable, this.changeTracking)
                newDirectParent.addDirectChild(newDirectChild)
// populate newDirectParent.groupingProps here                
for (let p of getCRUniquePropChain(this.hier, newDirectParent.kind)) newDirectParent.groupingProps[p] = newDirectChild.groupingProps[p]

                newDirectChild = newDirectParent
              } while (this.hier[newDirectParent.kind].parentKind !== lowestMatchingTIHG.kind) 
              lowestMatchingTIHG.addDirectChild(newDirectParent)
              returnValue = true
              break
          }
      }
    }

    return returnValue
  }
}
