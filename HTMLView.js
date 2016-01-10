var htmlparser = require('./vendor/htmlparser2')
var entities = require('./vendor/entities')
var React = require('react-native')
var {
  LinkingIOS,
  StyleSheet,
  Text,
  View,
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
          return (<Text key={index} style={{fontSize: 8}}>{node.data}</Text>);

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

        var preListString = "";
        if(node.name == 'li') {
          //go back up tree to find how many 'ul' tags there are
          //where number of UL tags = indentation level

          var tempNode = node;
          var numIndentationLevels = 0;
          while(tempNode.parent != null) {
            if(tempNode.parent.name == 'ul') {
              numIndentationLevels = numIndentationLevels + 1;
              preListString = "    " + preListString;
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
        }

        var postParagraphString = null;
        // if(node.name == 'p' && index < list.length-1) {
        //   postParagraphString = PARAGRAPH_BREAK;
        // }
        if(node.name == 'p') {
          postParagraphString = PARAGRAPH_BREAK;
        }
        // if(node.name == 'p') {

        //   var tempNode = node;
        //   while(tempNode.next != null) {
        //     tempNode = tempNode.next;
        //     console.log(tempNode.type);
        //     if(tempNode.type != "text")
        //       break;
        //   }
        //   if(tempNode.name == 'ul')
        //     postParagraphString = null;
        // }

        return (
          <Text key={index} 
                onPress={linkPressHandler}
                style={{backgroundColor: '#ffe5e5'}} >
            {node.name == 'pre' ? LINE_BREAK : null}
            {node.name == 'li' ? preListString : null}
            {domToElement(node.children, node)}
            {node.name == 'br' ? LINE_BREAK : null}
            {node.name == 'hr' ? "horizontal-rule not implemented yet\n" : null}
            {postParagraphString}
            {node.name == 'h1' || 
             node.name == 'h2' || 
             node.name == 'h3' || 
             node.name == 'h4' || 
             node.name == 'h5' ? PARAGRAPH_BREAK : null}
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
})

module.exports = HTMLView
