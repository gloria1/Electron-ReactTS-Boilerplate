import React from 'react';
import PropTypes from 'prop-types';

interface PaneProps {
  size?: number,
  percentage: boolean,
  primary: boolean,
  vertical: boolean,
  children: any,
}

interface PaneStyle {
  height?: string,
  width?: string,
}

function Pane(props: PaneProps) {
  const size = props.size || 0;
  const unit = props.percentage ? '%' : 'px';
  let classes = 'layout-pane';
  const style: PaneStyle = {};
  if (!props.primary) {
    if (props.vertical) {
      style.height = `${size}${unit}`;
    } else {
      style.width = `${size}${unit}`;
    }
  } else {
    classes += ' layout-pane-primary';
  }
  return (
    <div className={classes} style={style}>{props.children}</div>
  );
}

Pane.propTypes = {
  vertical: PropTypes.bool,
  primary: PropTypes.bool,
  size: PropTypes.number,
  percentage: PropTypes.bool,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ])
};

// not necessary? - support for defaultProps will be deprecated in the future - Pane.defaultProps = {
// not necessary? - support for defaultProps will be deprecated in the future -   vertical: false,
// not necessary? - support for defaultProps will be deprecated in the future -   primary: false,
// not necessary? - support for defaultProps will be deprecated in the future -   size: 0,
// not necessary? - support for defaultProps will be deprecated in the future -   percentage: false,
// not necessary? - support for defaultProps will be deprecated in the future -   children: []
// not necessary? - support for defaultProps will be deprecated in the future - };

export default Pane;
