const cardano = require("./cardano")
const getPolicyId = require("./get-policy-id")
const assets = require("./assets.json")
const { compact } = require("lodash")
const wallet = cardano.wallet("ADAPI")

const { policyId: POLICY_ID, mintScript } = getPolicyId()


// let data = 'stackabuse.com';
// let buff = new Buffer(data);
// let base64data = buff.toString('base64');
// console.log('"' + data + '" converted to Base64 is "' + base64data + '"');

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
//  e943af1d6284eef0de1e6c5fb45cdcef87b8c8bf8165d102cac55676.hassankhanimage
//e943af1d6284eef0de1e6c5fb45cdcef87b8c8bf8165d102cac5567668617373616e6b68616e696d616765
const umer = toHex('hassankhanimage');
console.log(umer);
const metadata_assets = assets.reduce((result, asset) => {


       const ASSET_ID = asset.id // PIADA0

    // remove id property from the asset metadata
    const asset_metadata = {
        ...asset
    }

    delete asset_metadata.id

    return {
        ...result,
        [ASSET_ID]: asset_metadata
    }
}, {})

console.log(metadata_assets);

const metadata = {
    721: {
        [POLICY_ID]: {
            ...metadata_assets
        }
    }
}


const txOut_value = assets.reduce((result, asset) => {
  
     const ASSET_ID = POLICY_ID + "." + toHex(asset.id)
    result[ASSET_ID] = 1
    return result

}, {
    ...wallet.balance().value
})


console.log(txOut_value);

const mint_actions = assets.map(asset => ({action: "mint", quantity: 1, asset: POLICY_ID + "." + toHex(asset.id), script: mintScript }))

const tx = {
    txIn: wallet.balance().utxo,
    txOut: [
        {
            address: wallet.paymentAddr,
            value: txOut_value
        }
    ],
    mint: mint_actions,
    metadata,
    witnessCount: 2
}




// Remove the undefined from the transaction if it extists
if(Object.keys(tx.txOut[0].value).includes("undefined")){
  delete tx.txOut[0].value.undefined
}


const buildTransaction = (tx) => {

    const raw = cardano.transactionBuildRaw(tx)
    const fee = cardano.transactionCalculateMinFee({
        ...tx,
        txBody: raw
    })

    tx.txOut[0].value.lovelace -= fee

    return cardano.transactionBuildRaw({ ...tx, fee })
}

const raw = buildTransaction(tx)

// 9. Sign transaction

const signTransaction = (wallet, tx) => {

    return cardano.transactionSign({
        signingKeys: [wallet.payment.skey, wallet.payment.skey],
        txBody: tx
    })
}

const signed = signTransaction(wallet, raw, mintScript)

// 10. Submit transaction

const txHash = cardano.transactionSubmit(signed)

console.log(txHash)
