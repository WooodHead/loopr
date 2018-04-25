import React from 'react';
import {Card, Spin, Button} from 'antd';
import {toNumber,toBig,toHex} from "Loopring/common/formatter";
import intl from 'react-intl-universal'
import {getTransactionByhash} from 'Loopring/ethereum/utils'
import {
  getEstimatedAllocatedAllowance,
  getFrozenLrcFee,
  getPendingRawTxByHash,
  notifyTransactionSubmitted
} from "Loopring/relay/utils";
import Notification from 'Loopr/Notification';
import {getGasPrice} from '../../../common/Loopring/relay/account';
import Alert from 'Loopr/Alert'



const MetaItem = (props) => {
  const {label, value, render} = props
  return (
    <div className="row pt10 pb10 zb-b-b">
      <div className="col">
        <div className="fs14 color-black-2">{label}</div>
      </div>
      <div className="col-8 text-right">
        <div className="fs14 color-black-1 text-wrap">{render ? render(value) : value}</div>
      </div>
    </div>
  )
};


class DetailBlock extends React.Component {

  state = {
    ethTx: null,
    loading: true
  };

  componentDidMount() {
    const {modals} = this.props;
    const modal = modals['transaction/detail'];
    const item = modal.item;
    const _this = this;
    getTransactionByhash(item.txHash).then(res => {
      if (!res.error) {
        const ethTx = res.result;
        _this.setState({loading: false, ethTx})
      } else {
        _this.setState({loading: false})
      }
    })
  }

  render() {
    const {modals} = this.props;
    const modal = modals['transaction/detail'];
    const item = modal.item;
    const {ethTx, loading} = this.state;
    const handleCopy = (value, e) => {
      e.preventDefault();
      e.clipboardData.setData("text", value);
    };
    const renders = {
      txHash: (value) => <a className="text-truncate d-block" target="_blank" onCopy={handleCopy.bind(this, value)}
                            href={`https://etherscan.io/tx/${value}`}>{value}</a>,
      blockNumber: (value) => <a className="text-truncate d-block" target="_blank"
                                 href={`https://etherscan.io/block/${value}`}>{value}</a>,
      address: (value) => <a className="text-truncate d-block" target="_blank" onCopy={handleCopy.bind(this, value)}
                             href={`https://etherscan.io/address/${value}`}>{value}</a>,
    };
    const getType = () => {

      switch (item.type) {
        case 'approve':
          return intl.get('txs.type_enable_title', {symbol: item.symbol});
        case 'send':
          return intl.get('txs.type_transfer_title', {symbol: item.symbol});
        case 'receive':
          return intl.get('txs.type_receive_title', {symbol: item.symbol});
        case 'convert_outcome':
          return item.symbol === 'ETH' ? intl.get('txs.type_convert_title_eth') : intl.get('txs.type_convert_title_weth');
        case 'convert_income':
          return item.symbol === 'WETH' ? intl.get('txs.type_convert_title_eth') : intl.get('txs.type_convert_title_weth');
        case 'cancel_order':
          return intl.get('txs.cancel_order')
        case 'cutoff':
          return intl.get('txs.cancel_all');
        case 'cutoff_trading_pair':
          return intl.get('txs.cancel_pair_order', {pair: item.content.market});
        default:
          return intl.get('txs.others')
      }
    };

    const reSendTx = (txHash) => {
      getPendingRawTxByHash(txHash).then(async (res) => {
        if (!res.error) {
          const tx = res.result;
          const gasPriceRes = await getGasPrice();
          tx.gasPrice = toHex(toBig(gasPriceRes.result));
          tx.data = tx.input;
          window.WALLET.sendTransaction(tx).then(({response, rawTx}) => {
            if (!response.error) {
              Notification.open({message: intl.get("txs.resend_success"), type: "success", description:(<Button className="alert-btn mr5" onClick={() => window.open(`https://etherscan.io/tx/${response.result}`,'_blank')}> {intl.get('token.transfer_result_etherscan')}</Button> )});
              notifyTransactionSubmitted({txHash: response.result, rawTx, from: window.WALLET.getAddress()});
            } else {
              Notification.open({message: intl.get("txs.resend_failed"), type: "error", description:response.error.message})
            }
          })
        } else {
          Notification.open({
            type: 'error',
            message: intl.get('txs.can_not_resend'),
            description: intl.get('txs.not_detail')
          });
        }
      })
    };

    return (
      <Card title={intl.get('txs.tx_detail')}>
        <Spin spinning={loading}>
          {!(ethTx && ethTx.blockNumber) && !loading && item.status === 'pending' &&
          <Alert className="mb15" type="info"  title ={intl.get("txs.resend_title")} description={intl.get('txs.resend_tips')}
                 actions={(<Button type='primary' onClick={reSendTx.bind(this, item.txHash)}>{intl.get("txs.resend")}</Button>)}
          />}
          {(ethTx && ethTx.blockNumber) && item.status === 'pending' && !loading &&
          <Alert className="mb15" type="info" title={intl.get('txs.not_need_resend')} description={
            <div className="">{intl.get('txs.not_resend_tips')}</div>}
          />
          }
          <MetaItem label={intl.get('txs.tx_hash')} value={item.txHash} render={renders.txHash}/>
          <MetaItem label={intl.get('txs.to')} value={item.to} render={renders.address}/>
          <MetaItem label={intl.get('txs.block_num')} value={item.blockNumber} render={renders.blockNumber}/>
          <MetaItem label={intl.get('txs.status')} value={intl.get('txs.' + item.status)}/>
          <MetaItem label={intl.get('txs.confirm_time')}
                    value={window.uiFormatter.getFormatTime(toNumber(item.updateTime) * 1e3)}/>
          <MetaItem label={intl.get('txs.type')} value={getType()}/>
          <MetaItem label={intl.get('token.gas_limit')} value={ethTx && window.uiFormatter.getFormatNum(ethTx.gas)}/>
          <MetaItem label={intl.get('token.gas_price')}
                    value={ethTx && window.uiFormatter.getFormatNum(toNumber(ethTx.gasPrice) / 1e9) + " Gwei"}/>
          <MetaItem label={intl.get('wallet.nonce')} value={toNumber(item.nonce)}/>
          <MetaItem label={intl.get('txs.value')} value={ethTx && toBig(ethTx.value).div(1e18).toNumber() + ' ETH'}/>
        </Spin>
      </Card>
    );
  }

}

export default DetailBlock;
