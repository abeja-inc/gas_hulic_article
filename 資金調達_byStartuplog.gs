function ReadJSON(){

  // spreadSheetオブジェクトの取得
  let spreadSheetByActive = SpreadsheetApp.getActive()
  let uniqueDataSheet   = spreadSheetByActive.getSheetByName("startuplog")
  let lastRow = uniqueDataSheet.getLastRow();

  for(i =1;i<=10;i++){
    let response = fechHtmlByUrl("https://startuplog.com/api/v2/creators/expact/contents?kind=note&disabled_pinned=false&with_notes=false&page=" + i)

    Logger.log("page=" + i);

    let json = JSON.parse(response)
    let contents = json["data"].contents

    for(var j=0;j<contents.length;j++){
      var info = parseBody(contents[j].body);
      if( info.企業名 != undefined){
        uniqueDataSheet.getRange(lastRow+1,1).setValue(json["data"].contents[j].publishAt)
        uniqueDataSheet.getRange(lastRow+1,2).setValue(info.企業名)
        uniqueDataSheet.getRange(lastRow+1,3).setValue(info.調達額)
        uniqueDataSheet.getRange(lastRow+1,4).setValue(info.調達年月)
        uniqueDataSheet.getRange(lastRow+1,5).setValue(json["data"].contents[j].name)
        uniqueDataSheet.getRange(lastRow+1,6).setValue(info.住所)
        uniqueDataSheet.getRange(lastRow+1,7).setValue(json["data"].contents[j].noteUrl)
        lastRow++;
      } 
    }
  }

  //重複の削除（重複キー：日時、企業名、タイトル）
  uniqueDataSheet.getRange(2, 1, uniqueDataSheet.getLastRow(), uniqueDataSheet.getLastColumn()).removeDuplicates([1,2,5]);;

  //リストのソート（日時の降順）
  uniqueDataSheet.getRange(2, 1, uniqueDataSheet.getLastRow(), uniqueDataSheet.getLastColumn()).sort({column: 1, ascending: false});}

function parseBody(body){

  let body_info = {};

  var bodys = body.split("\n\n")
  for(var j=0;j<bodys.length;j++){

    if(bodys[j].indexOf("：", 0)!=-1 && bodys[j].indexOf("\n", 0)!=-1){
      body_info[bodys[j].slice(bodys[j].indexOf("\n", 0)+1,bodys[j].indexOf("：", 0))] = bodys[j].slice(bodys[j].indexOf("：", 0)+1)
    }else if(bodys[j].indexOf("：", 0)!=-1){
      body_info[bodys[j].slice(0,bodys[j].indexOf("：", 0))] = bodys[j].slice(bodys[j].indexOf("：", 0)+1)
    }
  }

  return body_info;
}