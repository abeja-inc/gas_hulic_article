const unique_sheetname = "Mock:資金調達情報"
const id_sheetname = "id"
const target_fromt_day = 8; //デフォルト前日 //00:00〜
const target_to_day = 8; //デフォルト前日 //〜23:59
const search_word = ['資金調達','資本業務提携','資本提携'];

//朝6時に前日～当日（最新）の記事をSync
function ReadURL_Cycle(){

  ReadURL_prod(1,0)
}

function ReadURL_prod(_from=target_fromt_day,_to=target_to_day){

  // spreadSheetオブジェクトの取得
  let spreadSheetByActive = SpreadsheetApp.getActive()
  let uniqueDataSheet   = spreadSheetByActive.getSheetByName(unique_sheetname)
  let lastRow = uniqueDataSheet.getLastRow();

  //最新のIDを取得
  var id = spreadSheetByActive.getSheetByName(id_sheetname).getRange(2,1).getValue();

  search_word.forEach(function(word){
    var html = null;

    //ページネーション判定
    var next_flg = true;
    var page_index = 1

    while(next_flg){

      //Logger.log("page_index:"+page_index)

      //https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word=%E8%B3%87%E9%87%91%E8%AA%BF%E9%81%94&pagenum=2
      html = fechHtmlByUrl("https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word="+word+"&pagenum=" + page_index)

      if(html!=null){

        var list = Parser.data(html).from('<article class="list-article">').to('</article>').iterate();

        Logger.log(list)

        var title = Parser.data(html).from('<h3 class="list-article__title">').to('</h3>').iterate();
        var time = Parser.data(html).from('<time datetime="').to('" class="list-article__time">').iterate();
        var company = Parser.data(html).from('<span class="list-article__company-name--dummy">').to('</span>').iterate();
    
        for(var i=0;i<title.length;i++){

          var url = Parser.data(list[i]).from('<a href="').to('class="list-article__link">').build();

          if(isTargetDate(new Date(time[i]),_from,_to)){
            
            var url = "https://prtimes.jp" + url.replace('"',"");
            var company_info = getCompanyInfo(url)
            var result = 0;
            var trim_title = zenkakuToHankaku(company_info.title).replace('．','.');

            if(trim_title.indexOf("億", 0)!=-1){
              var slice_index = 0;
              if(trim_title.indexOf("億", 0)>=5){
                slice_index = trim_title.indexOf("億", 0)-5;
              }
              var sliceText = trim_title.slice(slice_index, trim_title.indexOf("億", 0))
              var RegExp = /\d+\.?\d*|\d*\.?\d+/;
              result = sliceText.match(RegExp);
              uniqueDataSheet.getRange(lastRow+1,11).setValue(result+"億");
            }

            var priority =  getPriority(result,trim_title);

            uniqueDataSheet.getRange(lastRow+1,1).setValue(id);
            uniqueDataSheet.getRange(lastRow+1,2).setValue(time[i].trim());
            uniqueDataSheet.getRange(lastRow+1,3).setValue(priority);
            uniqueDataSheet.getRange(lastRow+1,4).setValue(company[i].trim());
            uniqueDataSheet.getRange(lastRow+1,5).setValue(company_info.URL);
            uniqueDataSheet.getRange(lastRow+1,8).setValue(company_info.本社所在地);
            uniqueDataSheet.getRange(lastRow+1,9).setValue(company_info.設立);
            uniqueDataSheet.getRange(lastRow+1,10).setValue(trim_title);
            uniqueDataSheet.getRange(lastRow+1,12).setValue(company_info.資本金);
            uniqueDataSheet.getRange(lastRow+1,13).setValue(url);
            uniqueDataSheet.getRange(lastRow+1,14).setValue(word);

            //移転情報の取得
            if (priority != 3){
              var trans_info = getTransferInfo(company[i].trim());
              uniqueDataSheet.getRange(lastRow+1,7).setValue(trans_info.url);//修正しました
              uniqueDataSheet.getRange(lastRow+1,6).setValue(trans_info.date);//修正しました
            }

            lastRow++
            id++;
            next_flg = true;

          }else{
            if(isBeforeStartDate(new Date(time[i]),_from)){
              next_flg = false;
            }
          }
        }
      }
      page_index++;
    }

  });

  //重複の削除（重複キー：日時、企業名、タイトル）
  uniqueDataSheet.getRange(2, 1, uniqueDataSheet.getLastRow()-1, uniqueDataSheet.getLastColumn()).removeDuplicates([2,4]);;

  //リストのソート（日時の降順）
  uniqueDataSheet.getRange(2, 1, uniqueDataSheet.getLastRow()-1, uniqueDataSheet.getLastColumn()).sort({column: 2, ascending: false});

  //最新のIDで上書き
  spreadSheetByActive.getSheetByName(id_sheetname).getRange(2,1).setValue(id);

  //共有シートへ転記
  createList()

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

function getCompanyInfo(url) {

  let company_info = {};

  var $ = Cheerio.load(fechHtmlByUrl(url),{decodeEntities: false});
  var release_title = $(".release--title").first().text().trim();
  var keys = [];
  var values = [];

  $('.head-information').each((index, element) => {keys[index]=$(element).first().text().trim();})
  $('.body-information').each((index, element) => {values[index]=$(element).first().text().trim();})

  
  for(var i=0;i<values.length;i++){
      company_info[keys[i]] = values[i];
  }

  company_info['title'] = release_title;

  return company_info;

}

function isTargetDate(date,start,end) {

  var start_date = new Date();
  start_date.setDate(start_date.getDate() - start);
  //時刻を再セット
  start_date = new Date(Utilities.formatDate(start_date, 'JST', 'yyyy-MM-dd')+'T00:00:00+0900');

  var end_date = new Date();
  end_date.setDate(end_date.getDate() - end);
  //時刻を再セット
  end_date = new Date(Utilities.formatDate(end_date, 'JST', 'yyyy-MM-dd')+'T23:59:59+0900');

//  Logger.log("start:" + Utilities.formatDate(start_date, 'JST', 'yyyy-MM-dd HH:mm:ss'))
//  Logger.log("end:" + Utilities.formatDate(end_date, 'JST', 'yyyy-MM-dd HH:mm:ss'))
//  Logger.log("target:" + Utilities.formatDate(date, 'JST', 'yyyy-MM-dd HH:mm:ss'))

  if(date.getTime() >= start_date.getTime() && date.getTime() <= end_date.getTime()){
    return true;
  }else{
    return false;
  }
}

function getTransferInfo(keyword) {

  let trans_info =　{ url: "", date: "" };

  try{
    var transinfo_url = 'https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word='+ keyword + ' 移転';
    var $ = Cheerio.load(fechHtmlByUrl(transinfo_url),{decodeEntities: false});
    var hrefs=[];
    var companys=[];

    $('.list-article__link').each((index, element) => {hrefs[index]=$(element).attr('href');})
    $('.list-article__company-name--dummy').each((index, element) => {companys[index]=$(element).first().text().trim();})

    for (var i = 0; i < companys.length; i++) {
      if(keyword === companys[i]){
        var $ = Cheerio.load(fechHtmlByUrl("https://prtimes.jp"+hrefs[i]),{decodeEntities: false});
        var release_title = $(".release--title").first().text().trim();
        var release_date = $(".icon-time-release-svn").first().text().trim();

        if(release_title.indexOf("移転", 0)!=-1){
          trans_info["url"] = "https://prtimes.jp"+hrefs[i];
          trans_info["date"] = release_date.split(' ')[0];
          break;
        }
      }
    }
  }catch(e) {
    // 404の場合があるので例外を無視する
  }
  return trans_info;
}

function isBeforeStartDate(date,start){

  var start_date = new Date();
  start_date.setDate(start_date.getDate() - start);
  //時刻を再セット
  start_date = new Date(Utilities.formatDate(start_date, 'JST', 'yyyy-MM-dd')+'T00:00:00+0900');
  
  if(date.getTime() < start_date.getTime()){
    return true;
  }else{
    return false;
  }
}

//資金調達額 10億円以上：1
//資金調達額 1億以上:2
//タイトルに資金調達を含むかつ「から、より、実施」のいずれかを含む：3 ←ノイズニュース除外のための
//上記以外：4
function getPriority(result,title){

  var priority = 4;
  var ptr = /から|より|実施/;

  //Logger.log(ptr.test(title))

  if(result>=10){
    priority = 1;
  }else if(result!=0){
    priority = 2;
  }else if(title.indexOf('資金調達')!=-1 && ptr.test(title)){
    priority = 3;
  }else if(title.indexOf('資本業務提携')!=-1){
    priority = 3;
  }

  return priority;

}

function zenkakuToHankaku(str) {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}