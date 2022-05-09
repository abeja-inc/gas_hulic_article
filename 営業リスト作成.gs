const src_id = "1WME21v1em96gcgmKxwNE_WtOnPARkOyohbyQf--RJbA"; //リスト取得シートID
const src_sheetName = "Mock:資金調達情報"; //リスト取得シート名
const dst_id = "1HNo8iNvxP4rBKoRRnT_ITqdn3PYDJ31mzdS5pduen_I"; //書き込み先シートID
const dst_sheetName = "営業リスト";//書き込み先シート名

function createList() {

  const create = () => {
    const condition = {column: "C", value: 4};
    const isInStock = validatorBuilder(condition);

    //優先度が4以外を抽出
    const src = SpreadsheetApp.openById(src_id).getSheetByName(src_sheetName).getDataRange().getValues().filter(isInStock);
    if (src.length === 0) return;

    const dst = SpreadsheetApp.openById(dst_id).getSheetByName(dst_sheetName);

    //すでに転記済みのID以外を抽出
    const no_dup_src = deleteDuplicate(dst.getRange(1, 1, dst.getLastRow()).getValues(),src);
    if (no_dup_src.length === 0) return;

    var r = dst.getLastRow() + 1;
    no_dup_src.forEach(function(nds){
      //ここにdstへの転機を記載
      dst.getRange(r,1).setValue(nds[0]); //ID
      dst.getRange(r,2).setValue(nds[3]); //会社名
      dst.getRange(r,3).setValue(nds[4]); //コーポレートサイト
      dst.getRange(r,4).setValue(nds[7]); //住所
      dst.getRange(r,5).setValue(nds[2]); //顧客ランク
      dst.getRange(r,6).setValue("-"); //担当部署
      dst.getRange(r,7).setValue("-"); //担当者
      dst.getRange(r,8).setValue("-"); //電話番号
      dst.getRange(r,9).setValue("-"); //メールアドレス
      dst.getRange(r,10).setValue(Utilities.formatDate(new Date(nds[1]), 'JST','yyyy/MM/dd HH:mm:ss')); //日時
      dst.getRange(r,11).setValue(nds[9]); //記事タイトル
      dst.getRange(r,12).setValue(nds[12]); //記事URL
      //自動問い合わせ
      dst.getRange(r,13).setValue(`https://script.google.com/a/macros/abejainc.com/s/AKfycbxE0HsmK8HzFA_uuOlLcfVU5G5JdGMnCQzE6HHIJC8X3G8HHant1zoYWgDyRf9Gy2W4/exec?id=${nds[0]}`) 
            
      if (notSubject(nds[10], nds[7])) {
        dst.getRange(r,14).setValue("システム"); //名前
        dst.getRange(r,15).setValue("対象外"); //ステータス
        dst.getRange(r,16).setValue(Utilities.formatDate(new Date(), 'JST','yyyy/MM/dd HH:mm:ss')); //最終ステータス更新日
      }

      r++;
    });

    //リストのソート（日時の降順）
    dst.getRange(2, 1, dst.getLastRow(), dst.getLastColumn()).sort({column: 10, ascending: false});
  };

  const validatorBuilder = (cond) => (e) => e[getColNumber(cond.column)] != cond.value;
  const getColNumber = (alpha) => "ABCDEFGHIJKLMNOPQLSTUVWXYZ".indexOf(alpha.toUpperCase());

  create();
  
}

function deleteDuplicate(idArray,values){

  var ids = [];
  idArray.forEach(function(id){
    ids.push(id[0]);
  });

  let newValues = values.filter(row => ids.indexOf(row[0]) === -1);
  Logger.log("追加情報："+newValues)
  return newValues;

}

//2億円以下、都外を対象外
function notSubject(capital, address){
  const isNotTokyo = !address.match(/^(?!.*(北海道|大阪府|京都府|^.{2,3}県)).*([台江]東|中[央野]|([品荒]|江戸)川|([墨大]|千代)田|港|新宿|(世田|渋)谷|文京|目黒|杉並|豊島|北|板橋|練馬|足立|葛飾)区/);

  if (capital == "") {
    return isNotTokyo;
  } else {
    const intCapital = Number(capital.replace(/[^0-9.]/g, '')) * 100000000;
    return isNotTokyo || (intCapital <= 200000000);
  }
}