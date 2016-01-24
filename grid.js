import React from 'react-native';
import Cell from './Cell';
const {
  StyleSheet,
  View,
  Component,
} = React;

class Row extends Component {
	render(){
		return (
			<View style={[styles.row, this.props.style]}>
				{this.props.children}
			</View>
		)
	};
}

class Grid extends Component {
  constructor(props) {
    super(props)
    this.state = {
      columnWidths: [],
      gridRows: [],
      viewWidth: null,
    };

    this.temporaryColumnWidths = [];
    this.checkedAllCells = [];
    this.numCellsChecked = 0;
    this.finalizedColumns = false;

    this.receiveDimensionsFromCells = this.receiveDimensionsFromCells.bind(this);
    this.renderIndividualCell = this.renderIndividualCell.bind(this);
    this.finalizeColumnWidths = this.finalizeColumnWidths.bind(this);
  }

  componentWillMount() {
    let self = this;
    let childCellData = this.props.allCells;

    let row = [];
    let rows = [];

    function isFullRow(){

      let span = 0;
      row.map(function(cell){
        span += cell.colSpan;
      })

      if(span===24) return true;
      return false;
    }

    childCellData.map(function(child, index){
      row.push(child);

      if(isFullRow()){
        rows.push(row);
        row = [];
      }
    });

    var tempIndex = 0;
    while(tempIndex < this.props.numColumns) {
      this.temporaryColumnWidths.push(null);
      tempIndex++;
    }

    this.props.allCells.map((cell) => {
      this.checkedAllCells.push(false);
    })

    this.setState({
      gridRows: rows,
      columnWidths: this.temporaryColumnWidths,
     });
  }

  receiveDimensionsFromCells(width,height,index,row,column) {
    //collect and check column widths
    if(this.finalizedColumns === false) {
      if(this.temporaryColumnWidths[column-1] === null) { //zero-indexed
        this.temporaryColumnWidths[column-1] = width;
      }
      else if(this.temporaryColumnWidths[column-1] < width) {
        this.temporaryColumnWidths[column-1] = width;
      }

      if(this.checkedAllCells[index] === false) {
        this.checkedAllCells[index] = true;
        this.numCellsChecked++;
      }

      if(this.numCellsChecked === this.props.allCells.length) {
        this.finalizedColumns = true;
        this.finalizeColumnWidths();
        this.setState({
          columnWidths: this.temporaryColumnWidths,
        });

        return;
      }
    }
  }

  finalizeColumnWidths() {
    var viewWidth = this.state.viewWidth;
    if(viewWidth === null) {
      console.log("error, this should not happen, viewWidth can't be null at this point.");
      return;
    }

    var totalWidth = 0;
    this.temporaryColumnWidths = this.temporaryColumnWidths.map((width) => {
      width = width + 2; //make it 2 pixels wider
      totalWidth += width;
      return width;
    });

    if(totalWidth <= viewWidth) {
      return;
    }

    //reduce the widest column
    var maxValueSoFar = 0;
    var maxIndex = -1;
    this.temporaryColumnWidths.map((width,index) => {
      if(width > maxValueSoFar) {
        maxValueSoFar = width;
        maxIndex = index;
      }
    })
    this.temporaryColumnWidths[maxIndex] = this.temporaryColumnWidths[maxIndex] - (totalWidth - viewWidth);
    return;

  }

  renderIndividualCell(cell) {
    return (
      <Cell key={cell.text + String(cell.index)}
            colIndex={cell.colIndex}
            rowIndex={cell.rowIndex}
            cellIndex={cell.index}
            span={cell.colSpan}
            gridCallback={this.receiveDimensionsFromCells}
            style={{ padding: 5 }}
            columnWidths={this.state.columnWidths}
            content={cell.content} /> );
  }

	render() {
    let self = this;

		let GridComponent = self.state.gridRows.map((row,index) => {
			let content = row.map((cell) => {return (self.renderIndividualCell(cell)) });

      return (
				<Row  key={index}
              style={[styles.row, self.props.style, {
                borderTopWidth: 0,
                borderBottomWidth: 1,
                borderColor: 'gray',
              }]} >
					{content}
				</Row>
			)
		});

		if(GridComponent.length>1){
			return (
				<View
          onLayout={(event) => {
            var {x, y, width, height} = event.nativeEvent.layout;

            if(this.state.viewWidth !== width) {
              console.log('width: ' + width);
              console.log('height: ' + height);

              this.setState({
                viewWidth: width,
              });
            }
          }}
          style={[this.props.style, {flex: 1}]}>
            <View style={{alignSelf: 'center'}}>
  					  {GridComponent}
            </View>
				</View>
			);
		}else if(GridComponent.length===1){
			return GridComponent[0];
		}else{
			return null;
		}
	}
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row'
	}
});

module.exports = Grid
