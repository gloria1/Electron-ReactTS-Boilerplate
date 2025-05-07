import React, { ReactNode } from 'react';
import PropTypes, { ReactNodeLike } from 'prop-types';

import { SplitterLayoutProps } from 'react-splitter-layout'

import Pane from './Pane';


import { Icon } from '@blueprintjs/core'

import './index.css'


/* 
  ADAPTATIONS FROM SOURCE FROM REPO TO MAKE IT TYPED FOR TYPESCRIPT:
  declare props inside SplitterLayout implementation
    typed as SplitterLayoutProps (imported from @types)
    assigned default values per SplitterLayout.defaultProps in original source
  constructor explicitly Object.assign props passed in to this.props in constructor (not sure if necessary, does super(props) do it?)
  added interface for SplitterLayoutState (didn't see any in @types)
    declare it in class
    and used it where else needed
  other miscellaneous typings declared
  commented out code from clearSelection - not sure how to type it properly, not sure if needed for anything



*/


function clearSelection() {
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED  if (document.body.createTextRange) {
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED    // https://github.com/zesik/react-splitter-layout/issues/16
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED    // https://stackoverflow.com/questions/22914075/#37580789
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED    const range = document.body.createTextRange();
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED    range.collapse();
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED    range.select();
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED  } else if (window.getSelection) {
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED    if (window.getSelection().empty) {
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED      window.getSelection().empty();
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED    } else if (window.getSelection().removeAllRanges) {
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED      window.getSelection().removeAllRanges();
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED    }
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED  } else if (document.selection) {
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED    document.selection.empty();
  // DO NOTHING - CAN'T GET THIS TYPED PROPERLY, NOT SURE IF NEEDED  }
}

const DEFAULT_SPLITTER_SIZE = 15;

interface SplitterLayoutState {
  resizing: boolean,
  secondaryPaneSize: number
}

export class SplitterLayout extends React.Component {
  props: SplitterLayoutProps = {
    customClassName: '',
    vertical: false,
    percentage: false,
    primaryIndex: 0,
    primaryMinSize: 0,
    secondaryInitialSize: undefined,
    secondaryMinSize: 0,
    onDragStart: null,
    onDragEnd: null,
    onSecondaryPaneSizeChange: null,
    children: []
  }

  state: SplitterLayoutState

  container: HTMLDivElement
  splitter: HTMLDivElement

  constructor(props: SplitterLayoutProps) {
    super(props)
    Object.assign(this.props, props)  // not sure if this is necessary or a good idea
                                // doing this because I don't props passed to constructor getting assigned anywhere
    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleSplitterMouseDown = this.handleSplitterMouseDown.bind(this);
    this.state = {
      secondaryPaneSize: 0,
      resizing: false
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('touchend', this.handleMouseUp);
    document.addEventListener('touchmove', this.handleTouchMove);

    let secondaryPaneSize;
    if (typeof this.props.secondaryInitialSize !== 'undefined') {
      secondaryPaneSize = this.props.secondaryInitialSize;
    } else {
      const containerRect = this.container.getBoundingClientRect();
      let splitterRect;
      if (this.splitter) {
        splitterRect = this.splitter.getBoundingClientRect();
      } else {
        // Simulate a splitter
        splitterRect = { width: DEFAULT_SPLITTER_SIZE, height: DEFAULT_SPLITTER_SIZE };
      }
      secondaryPaneSize = this.getSecondaryPaneSize(containerRect, splitterRect, {
        left: containerRect.left + ((containerRect.width - splitterRect.width) / 2),
        top: containerRect.top + ((containerRect.height - splitterRect.height) / 2)
      }, false);
    }
    this.setState({ secondaryPaneSize });
  }

  componentDidUpdate(prevProps: SplitterLayoutProps, prevState: SplitterLayoutState) {
    if (prevState.secondaryPaneSize !== this.state.secondaryPaneSize && this.props.onSecondaryPaneSizeChange) {
      this.props.onSecondaryPaneSizeChange(this.state.secondaryPaneSize);
    }
    if (prevState.resizing !== this.state.resizing) {
      if (this.state.resizing) {
        if (this.props.onDragStart) {
          this.props.onDragStart();
        }
      } else if (this.props.onDragEnd) {
        this.props.onDragEnd();
      }
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('touchend', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleTouchMove);
  }

  getSecondaryPaneSize(containerRect: DOMRect, splitterRect: DOMRect | { width: number; height: number; }, clientPosition: { left: any; top: any; }, offsetMouse: boolean) {
    let totalSize;
    let splitterSize;
    let offset;
    if (this.props.vertical) {
      totalSize = containerRect.height;
      splitterSize = splitterRect.height;
      offset = clientPosition.top - containerRect.top;
    } else {
      totalSize = containerRect.width;
      splitterSize = splitterRect.width;
      offset = clientPosition.left - containerRect.left;
    }
    if (offsetMouse) {
      offset -= splitterSize / 2;
    }
    if (offset < 0) {
      offset = 0;
    } else if (offset > totalSize - splitterSize) {
      offset = totalSize - splitterSize;
    }

    let secondaryPaneSize;
    if (this.props.primaryIndex === 1) {
      secondaryPaneSize = offset;
    } else {
      secondaryPaneSize = totalSize - splitterSize - offset;
    }
    let primaryPaneSize = totalSize - splitterSize - secondaryPaneSize;
    if (this.props.percentage) {
      secondaryPaneSize = (secondaryPaneSize * 100) / totalSize;
      primaryPaneSize = (primaryPaneSize * 100) / totalSize;
      splitterSize = (splitterSize * 100) / totalSize;
      totalSize = 100;
    }

    if (primaryPaneSize < this.props.primaryMinSize) {
      secondaryPaneSize = Math.max(secondaryPaneSize - (this.props.primaryMinSize - primaryPaneSize), 0);
    } else if (secondaryPaneSize < this.props.secondaryMinSize) {
      secondaryPaneSize = Math.min(totalSize - splitterSize - this.props.primaryMinSize, this.props.secondaryMinSize);
    }

    return secondaryPaneSize;
  }

  handleResize() {
    if (this.splitter && !this.props.percentage) {
      const containerRect = this.container.getBoundingClientRect();
      const splitterRect = this.splitter.getBoundingClientRect();
      const secondaryPaneSize = this.getSecondaryPaneSize(containerRect, splitterRect, {
        left: splitterRect.left,
        top: splitterRect.top
      }, false);
      this.setState({ secondaryPaneSize });
    }
  }

  handleMouseMove(e: any) {
    if (this.state.resizing) {
      const containerRect = this.container.getBoundingClientRect();
      const splitterRect = this.splitter.getBoundingClientRect();
      const secondaryPaneSize = this.getSecondaryPaneSize(containerRect, splitterRect, {
        left: e.clientX,
        top: e.clientY
      }, true);
      clearSelection();
      this.setState({ secondaryPaneSize });
    }
  }

  handleTouchMove(e: any) {
    this.handleMouseMove(e.changedTouches[0]);
  }

  handleSplitterMouseDown() {
    clearSelection();
    this.setState({ resizing: true });
  }

  handleMouseUp() {
    this.setState((prevState: SplitterLayoutState) => (prevState.resizing ? { resizing: false } : null));
  }

  render() {

    //console.log(`SplitterLayout render called`)

    let containerClasses = 'splitter-layout';
    if (this.props.customClassName) {
      containerClasses += ` ${this.props.customClassName}`;
    }
    if (this.props.vertical) {
      containerClasses += ' splitter-layout-vertical';
    }
    if (this.state.resizing) {
      containerClasses += ' layout-changing';
    }

    const children = React.Children.toArray(this.props.children).slice(0, 2);
    if (children.length === 0) {
      children.push(<div />);
    }
    const wrappedChildren = [];
    const primaryIndex = (this.props.primaryIndex !== 0 && this.props.primaryIndex !== 1) ? 0 : this.props.primaryIndex;
    for (let i = 0; i < children.length; ++i) {
      let primary = true;
      let size = null;
      if (children.length > 1 && i !== primaryIndex) {
        primary = false;
        size = this.state.secondaryPaneSize;
      }
      wrappedChildren.push(
        <Pane vertical={this.props.vertical} percentage={this.props.percentage} primary={primary} size={size}>
          {children[i]}
        </Pane>
      );
    }

    return (
      <div className={containerClasses} ref={(c) => { this.container = c; }}>
        {wrappedChildren[0]}
        {wrappedChildren.length > 1 &&
          (
            <div
              role="separator"
              className="layout-splitter"
              ref={(c) => { this.splitter = c; }}
              onMouseDown={this.handleSplitterMouseDown}
              onTouchStart={this.handleSplitterMouseDown}
            >
              <Icon 
                icon={this.props.vertical ? 'arrow-up' : 'arrow-left'}
                color='white' 
                onClick={(ev)=>{
                  console.log(`arrowup icon clicked`)
                  ev.stopPropagation()
                }}
              />
            </div>
          )
        }
        {wrappedChildren.length > 1 && wrappedChildren[1]}
      </div>
    );
  }
}


//export default SplitterLayout;
