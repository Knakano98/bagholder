var express= require('express');
var fs= require('fs');
var snoowrap=require('snoowrap');
var pool=require("./db");
const config=require("./config.js");
const fetch = require('node-fetch');

const r = new snoowrap({
  //Todo: Encrypt before commiting
  userAgent: 'put your user-agent string here',
  clientId: config.client,
  clientSecret: config.Secret,
  refreshToken:config.refresh
});
var app= express();


//Routes






r.config({debug: true});

//.has might be a problem later, but documentation does say .has is O(1), so this should be fine?
let duplicateCheckMap=new Map();
var tickersMap=new Map();
var mentionedTickers=new Map();


//Functions
function fetchTickers(){
  fetch('https://api.iextrading.com/1.0/ref-data/symbols')
    .then(res => res.json())
    .then(body => {
      for(var stock of body){
        if(!tickersMap.has(stock.symbol)){
          tickersMap.set(stock.symbol,'0');
        }
      }
    });
}
function checkIfTicker(comment){
  //Check if ticker
  //If ticker, store comment into comments and save the ID
  //Then iterate through the content and save into stockmentioned/ junction table

  var tickerInComment=[];

  var tickerMentioned=false;

  var words=comment.body.toUpperCase().split(" ");
  for(word of words){
    //Is a ticker but not perviously mentioned

    //clean and make more concise later
    if(tickersMap.has(word) && !mentionedTickers.has(word)){
      mentionedTickers.set(word,1);
      tickerInComment.push(word);
      tickerMentioned=true;
    }
    else if(tickersMap.has(word) && mentionedTickers.has(word)){
      mentionedTickers.set(word,mentionedTickers.get(word)+1);
      tickerInComment.push(word);
      tickerMentioned=true;
    }
  }


  if(tickerMentioned){
    var textQuery='INSERT INTO comments(body,time) VALUES($1, $2) RETURNING id';

    //This is messy. Try to fix later
    //Inserts comments into comments table, then inserts every ticker in the comment into the stockmentioned table.
    //Saves the ID of most recent insert for filling up the junction table to connect the 2 tables.
    pool.query(textQuery,[comment.body,UTCEpochToLocal(comment.created_utc)]).then(function(value){
      var commentID=value.rows[0].id;
      textQuery="INSERT INTO stockmentioned (stockname) VALUES ($1) RETURNING id";
      for(ticker of tickerInComment){
        pool.query(textQuery,[ticker]).then(function(value){
          var stockID= value.rows[0].id;
          textQuery="INSERT INTO stockassign (comment_id,stock_id) VALUES ($1,$2)";
          pool.query(textQuery,[commentID,stockID]);
        })
      }
    }
    );

  }
  //return tickerMentioned;
}

function UTCEpochToLocal(utc){
  var myDate = new Date(0);
  myDate.setUTCSeconds(utc);
  return myDate;
}
function getSubredditComments(subredditName, duplicateMap){

  r.getSubreddit(subredditName).getNewComments().then(
    comments=> {
      comments.forEach(comment=> {
        if(!duplicateMap.has(comment.id)){
          duplicateMap.set(comment.id,('0'));
          checkIfTicker(comment);

        }
      })
    }
  );
}
function mapToObj(map){
  const obj = {}
  for (let [k,v] of map)
    obj[k] = v
  return obj
}

//Initialization
fetchTickers();
setInterval(function(){getSubredditComments('WallStreetBets',duplicateCheckMap);},5000);
//Writes ticker frequency to txt file
setInterval(function(){
  const myJson = {};
  myJson.myMap = mapToObj(mentionedTickers);
  const json = JSON.stringify(myJson);
  fs.writeFile('test.txt',json, (err)=> {
    if(err) throw err;
    console.log("Written");
  });

},60000);

//Todo:
//1: API integration
  //Reddit
    //Need to access comments: Done
    //Need to figureout how to A: Not get repeats and B: Get info up to last refresh: Done
  //Stocks
    //Need to get list of stock tickers:done
    //Get hashmap to store ticker mention frequency: done
//2: Storage Figured out
  //Need to get stock tickers mentioned into the table
    //Need to filter out common short phrases (Do this after)
    //Figure out how to get list of tickers into table column(We're just gonna change to json then insert, honestly )


//3: Functional prototype
//3.5: Add biz api
//4: React/ Make things pretty
//5: Add extras like graphs, news etc














app.use('/assets', express.static('assets'));

app.get('/', function(req,res){



  //console.log(mentionedTickers);

  res.sendFile(__dirname + '/home.html');
});







//Stocks
app.get('/stocks', function(req,res){
  res.send('stocks page');
});

app.get('/stocks/:id', function(req,res){
  res.send('stock page for' + req.params.id);
});

//Crypto
app.get('/crypto', function(req,res){
  res.send('crypto page');
});

app.get('/crypto/:id', function(req,res){
  res.send('crypto page for' + req.params.id);
});

//Page Not Found
app.get('*', function(req, res){
  res.status(404).send('404 Page Not Found');
});

app.listen(3000);
