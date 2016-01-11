var htmlparser = require('./vendor/htmlparser2')
var entities = require('./vendor/entities')
var React = require('react-native')
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

        if(node.name == 'p') {
          //This is the place to get non-image Component types into the ScrollView
          if(node.children[0].name == 'img') {
            return(
             <View  key={index} 
                    onPress={linkPressHandler}
                    style={{backgroundColor: '#ccffe6'}} >
              {domToElement(node.children, node)}
            </View>
            )
          }
        }

        if(node.name == 'hr')
          return( <View style={ opts.styles.hr } /> )

        return (
          <Text key={index} 
                onPress={linkPressHandler}
                style={{backgroundColor: '#ffe5e5'}} >
            {node.name == 'pre' ? LINE_BREAK : null}
            {node.name == 'li' ? preListString : null}
            {domToElement(node.children, node)}
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
  }
})

module.exports = HTMLView
