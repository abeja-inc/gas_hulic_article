//const unique_sheetname = "Mock:資金調達情報"

function ReadURL(){

  // spreadSheetオブジェクトの取得
  let spreadSheetByActive = SpreadsheetApp.getActive()
  let uniqueDataSheet   = spreadSheetByActive.getSheetByName(unique_sheetname)

  var html = null;

  //https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word=%E8%B3%87%E9%87%91%E8%AA%BF%E9%81%94&pagenum=2
  html = fechHtmlByUrl("https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word=%E8%B3%87%E9%87%91%E8%AA%BF%E9%81%94")

  if(html!=null){

    var list = Parser.data(html).from('<article class="list-article">').to('</article>').iterate();

    Logger.log(list)
    var title = Parser.data(html).from('<h3 class="list-article__title">').to('</h3>').iterate();
    var time = Parser.data(html).from('<time datetime="').to('" class="list-article__time">').iterate();
    var company = Parser.data(html).from('<span class="list-article__company-name--dummy">').to('</span>').iterate();

    for(var i=0;i<title.length;i++){

      var url = Parser.data(list[i]).from('<a href="').to('class="list-article__link">').build();

      var trim_title = title[i].trim().replace(/[\s\t\n]/g,"");
      //Logger.log(trim_title)
      uniqueDataSheet.getRange(i+2,1).setValue(i);
      uniqueDataSheet.getRange(i+2,2).setValue(time[i].trim());
      uniqueDataSheet.getRange(i+2,3).setValue(company[i].trim());
      uniqueDataSheet.getRange(i+2,4).setValue(trim_title);
      uniqueDataSheet.getRange(i+2,6).setValue("https://prtimes.jp" + url.replace('"',""));

      if(trim_title.indexOf("億円", 0)!=-1){
        var sliceText = trim_title.slice(trim_title.indexOf("億円", 0)-5, trim_title.indexOf("億円", 0))
        var RegExp = /\d+\.?\d*|\d*\.?\d+/;
        var result = sliceText.match(RegExp);
        uniqueDataSheet.getRange(i+2,5).setValue(result+"億円");
      }
    }
  }
}

function scraping(url_string) {
 
  Logger.log(url_string)

    //const URL = 'https://nlab.itmedia.co.jp/nl/articles/1610/04/news086.html';　
    var key = 'ak-54cvs-k4avj-zm8mf-9jm6m-gbg23';
    
    var option = 
        {url:url_string,
        renderType:"HTML",
        outputAsJson:true};
    var payload = JSON.stringify(option);
    payload = encodeURIComponent(payload);
    var url = "https://phantomjscloud.com/api/browser/v2/"+ key +"/?request=" + payload;
    var response = UrlFetchApp.fetch(url);
  
    var json = JSON.parse(response.getContentText());
    var source = json["content"]["data"];
    return source
}

function fechHtmlByUrl(url) {

  try {
    const response = UrlFetchApp.fetch(url);
    const headers = response.getHeaders();
    const contentType = headers['Content-Type'].replace(/\s+/g, '');
    const indexOfCharset = contentType.indexOf('charset=');
    const code = (indexOfCharset == -1) ? '' : contentType.substring(indexOfCharset + 8);
    return response.getContentText(code);
  } catch(e) {
    // 例外エラー処理
    Logger.log('Error:' + url)
    Logger.log(e)
    return null
  }
}