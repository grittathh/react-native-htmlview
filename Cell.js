import React from 'react-native';

const {
  StyleSheet,
  View,
  Component,
} = React;

class Cell extends Component {
	render() {
    var desiredWidth = this.props.columnWidths[this.props.colIndex-1];

		return (
			<View
        style={[styles.col, this.props.style, {width: desiredWidth}]}
        onLayout={(event) => {
                var {x, y, width, height} = event.nativeEvent.layout;
                this.props.gridCallback(width,height,
                  this.props.cellIndex,
                  this.props.rowIndex,
                  this.props.colIndex);
              }} >
        {this.props.content()}
      </View>
		)
	}
}

const styles = StyleSheet.create({
	col: {
	}
});

module.exports = Cell
