const cardano = require("./cardano")
const assets = require("./assets.json")
const getPolicyId = require('./get-policy-id')

const sender = cardano.wallet("ADAPI")

console.log(
    "Balance of Sender address" +
    cardano.toAda(sender.balance().value.lovelace) + " ADA"
)


function toHex(str,hex){
    try{
      hex = unescape(encodeURIComponent(str))
      .split('').map(function(v){
        return v.charCodeAt(0).toString(16)
      }).join('')
    }
    catch(e){
      hex = str
      console.log('invalid text input: ' + str)
    }
    return hex
  }

const { policyId: POLICY_ID } = getPolicyId()

function sendAssets({ receiver, assets }) {

    const txOut_value_sender = assets.reduce((result, asset) => {

        const ASSET_ID = POLICY_ID + "." + toHex(asset)
        delete result[ASSET_ID]
        return result
    }, {
        ...sender.balance().value
    })

    const txOut_value_receiver = assets.reduce((result, asset) => {

        const ASSET_ID = POLICY_ID + "." + toHex(asset)
        result[ASSET_ID] = 1
        return result
    }, {})

    // This is depedent at the network, try to increase this value of ADA
    // if you get an error saying: OutputTooSmallUTxO
    const MIN_ADA = 3

    const txInfo = {
        txIn: cardano.queryUtxo(sender.paymentAddr),
        txOut: [
            {
                address: sender.paymentAddr,
                value: {
                    ...txOut_value_sender,
                    lovelace: txOut_value_sender.lovelace - cardano.toLovelace(MIN_ADA)
                }
            },
            {
                address: receiver,
                value: {
                    lovelace: cardano.toLovelace(MIN_ADA),
                    ...txOut_value_receiver
                }
            }
        ]
    }

    const raw = cardano.transactionBuildRaw(txInfo)

    const fee = cardano.transactionCalculateMinFee({
        ...txInfo,
        txBody: raw,
        witnessCount: 1
    })

    txInfo.txOut[0].value.lovelace -= fee

    const tx = cardano.transactionBuildRaw({ ...txInfo, fee })

    const txSigned = cardano.transactionSign({
        txBody: tx,
        signingKeys: [sender.payment.skey]
    })

    const txHash = cardano.transactionSubmit(txSigned)

    console.log(txHash)
}

sendAssets({
    receiver: "addr_test1qpfdnqesskts5y8m2r696m5gl9njq99lupr8q5y65h54u6xrgeu6pd0ng8lhsnme5w4gdjfwfngl4tqxhpfasgampuksl3ktck",
    assets: assets.map(asset => asset.id)
})