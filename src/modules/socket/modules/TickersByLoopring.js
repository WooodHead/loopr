import React from 'react'
import PropTypes from 'prop-types';
import TickersByLooopringData from '../mocks/TickersByLoopring.json'
class TickersSocketContainer extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.state = {
      tickersByLoopring:[]
    }
  }
  componentDidMount() {
    const { socket } = this.context
    if(socket && socket.connected){
      socket.emit('loopringTickers_req','')
      socket.on('loopringTickers_res', (res)=>{
        console.log('loopringTickers_res')
        res = JSON.parse(res)
        if(res.result){
          this.setState({
            tickersByLoopring:res.result,
          })
        }
      })
    }
    if (!socket || !socket.connected) {
      console.log('socket not connected')
      this.setState({
        tickersByLoopring:TickersByLooopringData
      })
    }
  }
  componentWillUnmount() {
    const { socket } = this.context
    if (!socket) {
      console.log('socket not connected')
      return false
    }
    socket.off('loopringTickers_res')
  }
  getTickerBySymbol(symbol){
    return this.state.tickersByLoopring.find(item => item.symbol.toLowerCase() === symbol.toLowerCase() )
  }
  render() {
    const {children,...rest} = this.props
    const { socket } = this.context
    const childProps = {
      ...rest,
      tickersByLoopring:{
        items:this.state.tickersByLoopring,
        getTickerBySymbol:this.getTickerBySymbol.bind(this)
      }
    }
    const {render} = this.props
    if(render){
      return render.call(this,childProps)
    }
    return (
      <div>
         {
           React.Children.map(this.props.children, child => {
               return React.cloneElement(child, {...childProps})
           })
         }
      </div>
    )
  }
}
TickersSocketContainer.contextTypes = {
  socket: PropTypes.object.isRequired
};
export default TickersSocketContainer