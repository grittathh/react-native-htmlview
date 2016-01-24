var htmlparser = require('./vendor/htmlparser2')
var entities = require('./vendor/entities')
var React = require('react-native')
var Grid = require('./Grid');
var Cell = require('./Cell');

var {
  LinkingIOS,
  StyleSheet,
  Text,
  View,
  Image,
  PixelRatio,
} = React

var LINE_BREAK = '\n'
var PARAGRAPH_BREAK = ''
var BULLET = '\u2022 '
var CIRCLEBULLET = '\u29BF '
var WHITEBULLET = '\u25E6 '
var TRIANGLEBULLET = '\u2023 '

function htmlToElement(rawHtml, opts, done) {
  function domToElement(dom, parent) {
    if (!dom) return null

    return dom.map((node, index, list) => {
      if (opts.customRenderer) {
        var rendered = opts.customRenderer(node, index, list)
        if (rendered || rendered === null) return rendered
      }

      if (node.type == 'text') {
        if(node.data == "\n")
          return (<Text key={index} style={{fontSize: 6}}>{node.data}</Text>);

        return (
          <Text key={index} style={parent ? opts.styles[parent.name] : null}>
            {entities.decodeHTML(node.data)}
          </Text>
        )
      }

      if (node.type == 'tag') {
        var linkPressHandler = null
        if (node.name == 'a' && node.attribs && node.attribs.href) {
          linkPressHandler = () => opts.linkHandler(entities.decodeHTML(node.attribs.href))
        }

        if(node.name == 'table') {
          //find number of rows

          var thead = node.children.filter((child) => {return child.name === 'thead'});
          thead = thead[0];
          var tbody = node.children.filter((child) => {return child.name === 'tbody'});
          tbody = tbody[0];

          //find number of columns
          var tr = thead.children.filter((child) => {
            if(child.type === 'tag')
              return child.name === 'tr';
          });
          tr = tr[0];

          var th = tr.children.filter((child) => {
            if(child.type === 'tag')
              return child.name === 'th';
          });

          var numColumns = th.length;
          var colSpan = 24 / numColumns; //24 = full-width

          var finalCells = [];

          th.map((thItem) => {
            finalCells.push({
              children: thItem.children,
              align: thItem.attribs.style,
              index: finalCells.length,
              weight: 'bold',
            })
          })

          var tr = tbody.children.filter((child) => {
            if(child.type === 'tag')
              return child.name === 'tr';
          })

          tr.map((trItem) => {
            trItem.children.map((child) => {
              if(child.type === 'tag')
                if(child.name === 'td') {
                  finalCells.push({
                    children: child.children,
                    align: child.attribs.style,
                    index: finalCells.length,
                    weight: 'normal',
                  })
                }
            })
          })

          finalCells = finalCells.map((cell) => {
            var textAlignString = 'left';

            if(cell.align !== undefined) {
              textAlignString = cell.align.split(':');
              textAlignString = textAlignString.slice(textAlignString.length - 1, textAlignString.length);
              textAlignString = textAlignString[0];
            }

            var borderTopWidth = null;
            if(cell.index < numColumns)
              borderTopWidth = 0;

            var colIndex = 1 + cell.index - numColumns*Math.floor(cell.index / numColumns);
            var rowIndex = Math.ceil((1 + cell.index) / numColumns);

            cell.colIndex = colIndex;
            cell.rowIndex = rowIndex;            
            cell.colSpan = colSpan;
            cell.textAlignString = textAlignString;
            cell.borderTopWidth = borderTopWidth;
            cell.content = () => {
              return (
                <Text style={{textAlign: cell.textAlignString,
                              fontWeight: cell.weight}} >
                  {domToElement(cell.children, cell)}
                </Text>
              )
            }

            return cell;
          });


          return (
            <Grid key={index}
                  style={{paddingLeft: 0, paddingRight: 0}}
                  allCells={finalCells}
                  numColumns={numColumns}
                  numRows={finalCells.length / numColumns} /> );
        }

        if (node.name == 'img') {
          return(
            <Image
              key={node.attribs.alt}
              style={{width: 400, height: 400}} //need to get correct image size
              resizeMode={Image.resizeMode.contain}
              source={{uri: node.attribs.src}} />
          )
        }

        var preListString = "";
        if(node.name == "li") {
          var tempNode = node;
          var numIndentationLevels = 0;
          while(tempNode.parent != null) {
            if(tempNode.parent.name == 'ul') {
              numIndentationLevels = numIndentationLevels + 1;
            }

            tempNode = tempNode.parent;
          }

          switch(numIndentationLevels) {
            case 4:
              preListString = preListString + TRIANGLEBULLET;
              break;
            case 3:
              preListString = preListString + CIRCLEBULLET;
              break;
            case 2:
              preListString = preListString + WHITEBULLET;
              break;
            default:
              preListString = preListString + BULLET;
          }

          var listChildren = node.children;

          return(
            <View style={{flexDirection: 'row'}} >
              <View style={{backgroundColor: null,
                            paddingLeft: (numIndentationLevels)*2,
                            paddingRight: 2}} >
                <Text style={opts.styles.li}>{preListString}</Text>
              </View>
              <View key={index}
                    onPress={linkPressHandler}
                    style={{backgroundColor: null, flex: 1}} >
                {domToElement(node.children, node)}
              </View>
            </View>
          )
        }

        if(node.name == 'ul') {
          return (
            <View key={index}
                  onPress={linkPressHandler}
                  style={{backgroundColor: backgroundColor}}>
              {domToElement(node.children, node)}
            </View>
          )
        }

        if(node.name == 'p') {
          //This is the place to get non-image Component types into the ScrollView
          if(node.children[0].name == 'img') {
            return(
             <View  key={index}
                    onPress={linkPressHandler}
                    style={{backgroundColor: null}} >
              {domToElement(node.children, node)}
            </View>
            )
          }
        }

        if(node.name == 'pre') {
          return(
            <View  key={index}
                  onPress={linkPressHandler}
                  style={{paddingLeft: 50}} >
              <Text >
                {domToElement(node.children, node)}
              </Text>
            </View>
          )
        }

        if(node.name == 'hr')
          return( <View style={ opts.styles.hr } /> )

        var backgroundColor = null;

        if(node.name == 'mark')
          backgroundColor = 'yellow';

        return (
          <Text key={index}
                onPress={linkPressHandler}
                style={{backgroundColor: backgroundColor}}>
            {node.name == 'pre' ? LINE_BREAK : null}
            {node.name == 'q' ? "\"" : null}
            {domToElement(node.children, node)}
            {node.name == 'q' ? "\"" : null}
            {node.name == 'br' ? LINE_BREAK : null}
          </Text>
        )
      }
    })
  }

  var handler = new htmlparser.DomHandler(function (err, dom) {
    if (err) done(err)
    done(null, domToElement(dom))
  })
  var parser = new htmlparser.Parser(handler)
  parser.write(rawHtml)
  parser.done()
}

var HTMLView = React.createClass({
  mixins: [
    React.addons.PureRenderMixin,
  ],
  getDefaultProps() {
    return {
      onLinkPress: LinkingIOS.openURL,
    }
  },
  getInitialState() {
    return {
      element: null,
    }
  },
  componentWillReceiveProps() {
    if (this.state.element) return
    this.startHtmlRender()
  },
  componentDidMount() {
    this.startHtmlRender()
  },
  startHtmlRender() {
    if (!this.props.value) return
    if (this.renderingHtml) return

    var opts = {
      linkHandler: this.props.onLinkPress,
      styles: Object.assign({}, baseStyles, this.props.stylesheet),
      customRenderer: this.props.renderNode,
    }

    this.renderingHtml = true
    htmlToElement(this.props.value, opts, (err, element) => {
      this.renderingHtml = false

      if (err) return (this.props.onError || console.error)(err)

      if (this.isMounted()) this.setState({element})
    })
  },
  render() {
    if (this.state.element) {
      return <View children={this.state.element} />
    }
    return <View />
  }
})

var boldStyle = {fontWeight: '500'}
var italicStyle = {fontStyle: 'italic'}
var codeStyle = {fontFamily: 'Menlo'}

var baseStyles = StyleSheet.create({
  b: boldStyle,
  strong: boldStyle,
  i: italicStyle,
  em: italicStyle,
  pre: codeStyle,
  code: codeStyle,
  a: {
    fontWeight: '500',
    color: '#007AFF',
  },
  hr: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    height: 1 / PixelRatio.get(),
    marginLeft: 0,
    marginRight: 0,
  },
  del: {
    textDecorationLine: "line-through",
  },
  u: {
    textDecorationLine: "underline",
  },
})

module.exports = HTMLView
