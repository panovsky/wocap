//  fixme вынести в фцию ()

var idleArr =[];
var runArr = [];
var slashArr = [];
var hitArr = [];
var deadArr = [];
// fixme чтото надо делать с этим говном (в джсон загнать?)
for(var i =0; i<30; i+=1){
  idleArr.push(i);
}

for(var i=30; i<36; i+=1){
  runArr.push(i);
}

for(var i=36; i<47; i+=1){
  slashArr.push(i);
}

for(var i = 47; i<51; i+=1){
  hitArr.push(i);
}

for(var i = 51; i<65; i+=1){
  deadArr.push(i);
}


var ready = false;
var eurecaServer;
//var eurecaClient;

var myId; // my iD
var enId; // enemy ID
var gameId; // game ID

var loginSucces = false;

// handle client communication with server
var eurecaClientSetup = function() {
  // create instance of eureca.io client
  var eurecaClient = new Eureca.Client();

  eurecaClient.ready(function (proxy){
    eurecaServer = proxy;

    //we temporary put create function here so we make sure to launch the game once the client is ready
    
  });

  eurecaClient.exports.setId = function(id){
    myId = id;
    create();
    eurecaServer.handshake();
    //eurecaServer.playerState(myId, 'login');
    ready = true;
  }

  eurecaClient.exports.kill = function(id){
    //if(tanksList[id]){
      //tanksList[id].kill();
      //console.log('Kill tank ', id, tanksList[id]);
    //}
  }

  eurecaClient.exports.spawnEnemy = function(i, x, y){
    if(i == myId) return;

    console.log('spawn');
    //var tnk = new Tank(i, game, tank);
    //tanksList[i] = tnk;
  }

  eurecaClient.exports.testRemote = function(msg){
    console.log('onServer');
  }

  // ответ от серванта о юзере-пароле
  eurecaClient.exports.loginAnswer = function(answ){

    console.log(answ);
    if(answ == 'yes'){
      loginSucces = true;
      startGarage();
    } else {
      startLogin();
    }
      console.log('loginSucces', loginSucces);
  }

  // NEW GAME
  eurecaClient.exports.newGame = function(gId, eId, gField, turn, figures){
    gameId = gId;
    enId = eId;
    console.log('game: ' + gameId + ' :was created');
    startTestGame(gField, turn, figures);
  }

  // NEW FIGURE
  eurecaClient.exports.addNewFigure = function(figTmp, gField){
    createNewFigure(figTmp, gField);
  }

  // toggle preloader
  eurecaClient.exports.tgPreloader = function(){
    togglePreloader();
  }

  // CHAT
  eurecaClient.exports.chat = function (msg){
    console.log(msg);
  }

  eurecaClient.exports.getMarkers = function(mrk){
    addMarkers(mrk);
  }

  eurecaClient.exports.getSpawnMarkers = function(mrk){
    addSpawnMarkers(mrk);
  }

  eurecaClient.exports.ungetMarkers = function(){
    clearMarkers();
  }

  eurecaClient.exports.getFigureMove = function(inx, coord){
    inv[inx].coord = coord;
    //inv[inx].width += 100;  // fixme
    //inv[inx].height += 100;
    inv[inx].tween = game.add.tween(inv[inx]).to( { x: coord_toX(coord), y: coord_toY(coord) /*, width: inv[inx].width-100, height: inv[inx].height-100 */}, 500, "Quart.easeOut", true);
    inv[inx].tween.onComplete.add(moveComplete, inv[inx]);

    inv[inx].animations.play('pawn@run', 15, true);
    //console.log(coord)
    //console.log(coord_toX(coord) + ':' + coord_toY(coord));
    //  когда твин комплит - переключать ХОД. видимо пока так
  }

  function moveComplete(){
    this.animations.play('pawn@idle', 15, true);
  }


  eurecaClient.exports.getFigureAttack = function(attInx, attCoord, attHp, defInx, defCoord, defHp, tempDef){
    // fixme координаты забыл. атакующий летит в координаты нападающего, потом в свои, либо шмерть
    inv[attInx].health = attHp;
    inv[attInx].rightText.setText(attHp.toString());
    inv[attInx].coord = attCoord;


    inv[attInx].tween = game.add.tween(inv[attInx]).to( { x: coord_toX(tempDef), y: coord_toY(tempDef) }, 300, "Quart.easeOut", true);
    inv[attInx].target = defInx;
    inv[attInx].tween.onComplete.add(attackComplete, inv[attInx]);

    inv[attInx].animations.play('pawn@slash', 15, true);
    
    inv[defInx].health = defHp;
    inv[defInx].rightText.setText(defHp.toString());
    inv[defInx].animations.play('pawn@hit', 15, false);

    //  анимация смерти
    if(inv[defInx].health == 0){
      inv[defInx].tween = game.add.tween(inv[defInx]).to({x: inv[defInx].x}, 300, "Quart.easeOut", true);
      inv[defInx].tween = game.add.tween(inv[defInx]).to({y: inv[defInx].y}, 300, "Quart.easeOut", true);
      inv[defInx].tween.onComplete.add(deadComplete, inv[defInx]);
      inv[defInx].coord = '0:0';
      inv[defInx].inputEnabled = false;
      inv[defInx].animations.play('pawn@dead', 15, false);
    }
  }


}

// ИГРА ОКОНЧЕНА
function battleComplete(win){
  //вырубаем инпуты
  for(i=0; i<inv.length; i+=1){
    inv[i].inputEnabled = false;
  }


  if(win){
    addButton('exitBattle', 'testButton', myWidth*0.5, myHeight*0.5, 'You win!', btExBattle, 4, 1);
  } else {
    addButton('exitBattle', 'testButton', myWidth*0.5, myHeight*0.5, 'You loose...', btExBattle, 4, 1);
  }
}


// СМЕРТЬ ЗАВЕРШЕНА  fixme так себе способ, кнешн
function deadComplete(){
  // убираем с поля
  this.tween = game.add.tween(this).to( { x: 40, y: this.y }, 300, "Quart.easeOut", true);
  this.leftBar.visible = false;
  this.leftText.visible = false;
  this.rightBar.visible = false;
  this.rightText.visible = false;


  // конец игры?
  if(this.type=='king' && this.id == myId){
    battleComplete();
  } else if(this.type=='king'){
    battleComplete(myId);    
  }
}

// АТАКА ЗАВЕРШЕНА
function attackComplete(){
   
  //  fixme это после анимации смерти (или это и есть смерть)
  if(this.coord == '0:0'){
    this.tween = game.add.tween(this).to( { x: this.x }, 300, "Quart.easeOut", true);
    this.tween = game.add.tween(this).to( { y: this.y }, 300, "Quart.easeOut", true);
    this.tween.onComplete.add(deadComplete, this);
    this.inputEnabled = false;
    this.animations.play('pawn@dead', 15, false);
  } else {    
    this.tween = game.add.tween(this).to( { x: coord_toX(this.coord) }, 300, "Quart.easeOut", true);
    this.tween = game.add.tween(this).to( { y: coord_toY(this.coord) }, 300, "Quart.easeOut", true);
    this.animations.play('pawn@idle', 15, true);
  }

  if(inv[this.target].health!==0){
    inv[this.target].animations.play('pawn@idle', 15, true);
  }
}




// РАЗМЕРЫ ДАВАТЬ В ДИВе ИНДЕКС.ХТМЛ И РЕСАЙЗИТЬ ??

// 1600x900 | 800x450 | 1200x675 | 1280x720 = 80
// 1120x630

var mySize = 70;
var myWidth = 16;
var myHeight = 9;

myWidth *=mySize;
myHeight *=mySize;

var text=null;
var bg=null;

// BOARD
//max 12*8
//min 5*4
var field = {};
field.w = 5;
field.h = 4;
field.tile = [];
field.txt = [];
field.underCursor = '';
field.underCursorNum = '';
// revers
var temp = 0;

//точка отсчёта
var startPointX;
var startPointY;

//PIECES
var inv = [];
var dragObj = null; //?нахуй драгНдроп?

// Markers
var mrkArr = [];

// buttons
var intf = [];

// text on field
var styleField = {
    font: "16px Arial",
    fill: "#dddddd",
    align: "center"
  }

var styleButton = {
    font: "24px Arial",
    fill: "#dddddd",
    align: "center"
}

var styleAttr = {
    font: "12px Arial",
    fill: "#dddddd",
    align: "center"
}

// Preloader (not loader)
var preloader = {};


// CANVASINPUT text fields (RLY?)
var inputEmail;
var inputPass;



var game = null;

game = new Phaser.Game(myWidth, myHeight, Phaser.AUTO, 'wocapgame', {
  preload: preload,
  create: eurecaClientSetup,
  update: update,
  render: render
});

//индикатор зсгрузки
function updateProgressBar() {

  // Another file has just loaded, so update the size of my progress bar graphic here
  text.setText(game.load.progress);
}

function preload() {
  
  game.gameState = 'loading';
    //Size
    game.scale.minWidth = 400;
    game.scale.minHeight = 225;
     game.scale.maxWidth = myWidth;
    game.scale.maxHeight = myHeight;
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
  game.scale.updateLayout(true);
  //game.stage.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
  
  // для фпс. убрать позже
  game.time.advancedTiming = true;
  
  //не врубать паузу при потере фокуса
  game.stage.disableVisibilityChange = true;

  //загрузочный спрайт
  text = game.add.text(game.world.centerX, game.world.centerY, "0", {
    font: "65px Arial",
    fill: "#ff0044",
    align: "center"
  });
  game.load.onFileComplete.add(updateProgressBar, this);

  //intrfc
  game.load.image('testButton', 'img/testButton.jpg');
  

  //tiles
  game.load.spritesheet('tileStone', 'img/tiles/stone.jpg', 60, 60, 2);

  game.load.spritesheet('pawn', 'img/pawn_list_.png', 60, 59, 100);
  game.load.spritesheet('king', 'img/king_list_.png', 60, 60, 100);

  //  pieces
  game.load.image('greenPawn', 'img/greenPawn.png');
  game.load.image('greenPawn', 'img/redPawn.png');
  game.load.image('greenKing', 'img/greenKing.png');
  game.load.image('redKing', 'img/redKing.png');

  //  attributes bar
  game.load.spritesheet('attrBar', 'img/attrBar.png', 20, 20, 2);

  //  markers
  game.load.spritesheet('markers', 'img/markers.png', 60, 60, 3);

  game.load.image('preloaderBG', 'img/preloader_bg.jpg')

  //
  //game.smoothed = false;
}

function create() {
  //оттут доки надо глянуть - можно ли сюда нырять из апдейта, или нет

  game.gameState = 'create';

  game.stage.backgroundColor = '#222222';
  game.world.setBounds(0, 0, 3405, 2142);

  preloader.bg = game.add.image(myWidth/2, myHeight/2, 'preloaderBG');
  preloader.bg.anchor.setTo(0.5, 0.5);
  preloader.bg.visible = false;
  
  text.destroy();
  
  //game.add.sprite
  //bg = game.add.image(0,0,'bg3');
  

  
  // ЛОГИНИМ (СЯ)
  startLogin();
}

/////////////////////////////
// LOGIN SCREEN
/////////////////////////////
function startLogin(){
  //gameStateClear();
  game.gameState = 'login';
  eurecaServer.playerState(myId, 'login');

  // КНОПКА ЛОГИН (index, image, x, y, text, function)
  document.getElementById("inTxt").style.display = "inline";
  document.getElementById("inEml").value = '';
  document.getElementById("inPwd").value = '';
  

  //addButton('email', 'testButton', myWidth/2, myHeight*0.4, 'Email', btLogin, 4, 1);
  //addButton('password', 'testButton', myWidth/2, myHeight*0.5, 'Password', btLogin, 4, 1);
  addButton('login', 'testButton', myWidth/2, myHeight*0.6, 'Login', btLogin, 4, 1);
  addButton('guest', 'testButton', myWidth/2, myHeight*0.7, 'Guest', btLoginGuest, 4, 1);
}

function stopLogin(){
  destroyerAsAr(intf);
  document.getElementById("inTxt").style.display = "none";
}

function btLogin(){
  
  stopLogin();
  eurecaServer.checkLogin(myId, document.getElementById("inEml").value, document.getElementById("inPwd").value);
  //startgarage вызываем из loginanswer  
}

function btLoginGuest(){
  
  stopLogin();
  eurecaServer.checkLogin(myId, '716234@mail.ru', '1234');
  //startgarage вызываем из loginanswer  
}

/////////////////////////////
// GARAGE SCREEN
/////////////////////////////
function startGarage(){
  //gameStateClear();
  game.gameState = 'garage';
  eurecaServer.playerState(myId, 'garage');

  addButton('battleStart', 'testButton', myWidth*0.5, myHeight*0.1, 'battle', btBattle, 4, 1);
  addButton('logout', 'testButton', myWidth*0.85, myHeight*0.1, 'logout', btLogout, 4, 1);
}

function stopGarage(){
  destroyerAsAr(intf);
}

function btBattle(){
  game.gameState = 'wait';
  eurecaServer.playerState(myId, 'wait');

  //eurecaServer.playerChekOponent(myId);

 

  stopGarage();
  //startTestGame();
}

function btLogout(){
  stopGarage()
  startLogin();
}


/////////////////////////////
// BATTLE SCREEN START
/////////////////////////////
function startTestGame(gField, turn, figures){
  //gameStateClear();
  game.gameState = 'battle';
  eurecaServer.playerState(myId, 'battle');

  //  заглуха под интрфс
  intf['tst'] = game.add.sprite(myWidth/4, 0, 'testButton');
  intf['tst'].anchor.setTo(1,0);
  intf['tst'].width = 300;
  intf['tst'].height = myHeight;

  addButton('exitBattle', 'testButton', myWidth*0.1, myHeight*0.1, 'exit', btExBattle, 4, 1);
  addButton('hello', 'testButton', myWidth*0.1, myHeight*0.2, 'Hello!', btHello, 4, 1);

  // поле 
  if(myId == turn){
    drawField(gField);
  } else {
    drawFieldRew(gField);
  }

  //  fixme ебануть в фцию
  

}

//  вхренячиваем фигуру
function createNewFigure(figure, gField){


    var ii = inv.length;

    inv[ii] = game.add.sprite(100, 100, figure.type);

    inv[ii].type = figure.type;
 
    inv[ii].animIdle = inv[ii].animations.add('pawn@idle', idleArr);
    inv[ii].animRun = inv[ii].animations.add('pawn@run', runArr);
    inv[ii].animSlash = inv[ii].animations.add('pawn@slash', slashArr);
    inv[ii].animHit = inv[ii].animations.add('pawn@hit', hitArr);
    inv[ii].animDead = inv[ii].animations.add('pawn@dead', deadArr);
    inv[ii].animations.play('pawn@idle', 15, true);
    inv[ii].anchor.setTo(0.5, 0.5);
    inv[ii].inx = figure.inx;
    
    //красим и присваиваем плаеру
    if(figure.id == myId){  
      inv[ii].tint = 0xAAFFAA;
      inv[ii].id = myId;
    }else{   
      inv[ii].tint = 0xFFAAAA;
    }

    //координаты
    inv[ii].coord = figure.coord;
    
    if(inv[ii].coord!='0:0'){
      coord_toXY(inv[ii], inv[ii].coord, gField.w, gField.h)
    } else {
      //  в резерв
      coord_toReserve(inv[ii]);
    }

    inv[ii].attack = figure.attack;
    inv[ii].health = figure.health;

 

    //включаем инпуты для своих (fixme безопасность под вопросом)
    if(inv[ii].id == myId){
      inv[ii].inputEnabled = true;
      inv[ii].input.useHandCursor = true;
      inv[ii].events.onInputDown.add(figDown, inv[ii]);
      inv[ii].events.onInputOver.add(figOver, inv[ii]);
      inv[ii].events.onInputOut.add(figOut, inv[ii]);
    }

    // чайлдим кружки и цифры
    inv[ii].leftBar = inv[ii].addChild(game.add.sprite(-20, 20, 'attrBar', 0));
    inv[ii].leftBar.anchor.setTo(0.5, 0.5);

    inv[ii].leftText = inv[ii].addChild(game.add.text(-20, 20, figure.attack.toString(), styleAttr));
    inv[ii].leftText.anchor.setTo(0.5, 0.25);


    inv[ii].rightBar = inv[ii].addChild(game.add.sprite(20, 20, 'attrBar', 1));
    inv[ii].rightBar.anchor.setTo(0.5, 0.5);

    inv[ii].rightText = inv[ii].addChild(game.add.text(20, 20, figure.health.toString(), styleAttr));
    inv[ii].rightText.anchor.setTo(0.5, 0.25);

    inv[ii].smoothed = false;
    inv[ii].scale.set(1.5);
  
}

function figDown(){
  eurecaServer.activateFigure(gameId, myId, this.inx);
  console.log(this.inx);
}

function figOver(){
  this.scale.set(1.1);
}

function figOut(){
  this.scale.set(1);
}

//  МАРКЕРЫ ДЛЯ СПАВНА
function addSpawnMarkers(mrk){
  for(var i=0; i<mrk.length; i+=1){
    mrkArr.push( game.add.sprite(coord_toX(mrk[i].coord), coord_toY(mrk[i].coord), 'markers', 0));
    mrkArr[mrkArr.length-1].anchor.setTo(0.5, 0.5);
    mrkArr[mrkArr.length-1].inx = i;

    mrkArr[mrkArr.length-1].inputEnabled = true;
    mrkArr[mrkArr.length-1].input.useHandCursor = true;
    mrkArr[mrkArr.length-1].events.onInputDown.add(mrkDown, mrkArr[mrkArr.length-1]);
    mrkArr[mrkArr.length-1].events.onInputOver.add(mrkOver, mrkArr[mrkArr.length-1]);
    mrkArr[mrkArr.length-1].events.onInputOut.add(mrksOut, mrkArr[mrkArr.length-1]);
  }
}

//  ДОБАВЛЯЕМ МАРКЕРЫ
function addMarkers(mrk){
  for(var i=0; i<mrk.length; i+=1){
    if(mrk[i].type == 'move'){
      mrkArr.push( game.add.sprite(coord_toX(mrk[i].coord), coord_toY(mrk[i].coord), 'markers', 0));
      mrkArr[mrkArr.length-1].anchor.setTo(0.5, 0.5);
      mrkArr[mrkArr.length-1].angle = mrk[i].angle;
      mrkArr[mrkArr.length-1].inx = i;

      mrkArr[mrkArr.length-1].inputEnabled = true;
      mrkArr[mrkArr.length-1].input.useHandCursor = true;
      mrkArr[mrkArr.length-1].events.onInputDown.add(mrkDown, mrkArr[mrkArr.length-1]);
      mrkArr[mrkArr.length-1].events.onInputOver.add(mrkOver, mrkArr[mrkArr.length-1]);
      mrkArr[mrkArr.length-1].events.onInputOut.add(mrksOut, mrkArr[mrkArr.length-1]);
      // input enable = true (или что я там обычно пишу в таких случаях?)    
    } else if(mrk[i].type == 'support'){
      mrkArr.push( game.add.sprite(coord_toX(mrk[i].coord), coord_toY(mrk[i].coord), 'markers', 2));
      mrkArr[mrkArr.length-1].anchor.setTo(0.5, 0.5);
      mrkArr[mrkArr.length-1].angle = mrk[i].angle;
      mrkArr[mrkArr.length-1].inx = i;

      mrkArr[mrkArr.length-1].inputEnabled = true;
      mrkArr[mrkArr.length-1].input.useHandCursor = true;
      mrkArr[mrkArr.length-1].events.onInputDown.add(mrkDown, mrkArr[mrkArr.length-1]);
      mrkArr[mrkArr.length-1].events.onInputOver.add(mrkOver, mrkArr[mrkArr.length-1]);
      mrkArr[mrkArr.length-1].events.onInputOut.add(mrksOut, mrkArr[mrkArr.length-1]);
    } else if(mrk[i].type == 'attack'){
      mrkArr.push( game.add.sprite(coord_toX(mrk[i].coord), coord_toY(mrk[i].coord), 'markers', 1));
      mrkArr[mrkArr.length-1].anchor.setTo(0.5, 0.5);
      mrkArr[mrkArr.length-1].angle = mrk[i].angle;
      mrkArr[mrkArr.length-1].inx = i;

      mrkArr[mrkArr.length-1].inputEnabled = true;
      mrkArr[mrkArr.length-1].input.useHandCursor = true;
      mrkArr[mrkArr.length-1].events.onInputDown.add(mrkDown, mrkArr[mrkArr.length-1]);
      mrkArr[mrkArr.length-1].events.onInputOver.add(mrkOver, mrkArr[mrkArr.length-1]);
      mrkArr[mrkArr.length-1].events.onInputOut.add(mrksOut, mrkArr[mrkArr.length-1]);
    }
  }
}

function mrkDown(){
  eurecaServer.mrkDown(gameId, myId, this.inx);
}

function mrkOver(){
  this.scale.set(1.05);
}

function mrksOut(){
  this.scale.set(1);
}

function clearMarkers(){
  for(var i=0; i<mrkArr.length; i+=1){
    mrkArr[i].destroy();
  }
  mrkArr.length = 0;
}


//в резерв
function coord_toReserve(fgr){
  console.log('any body hear me?');
  if(fgr.id == myId){
    fgr.x = myWidth*.9;
    fgr.y = myHeight*.9;
  } else {
    fgr.x = 0;
    fgr.y = 0;    
  }
}

// перемещение в ХУ по доске
function coord_toXY(fgr, a1, w, h){

  console.log(fgr.type + ' ' + fgr.coord);

  if(a1.length>3){
    var ww = parseInt(a1[2]+a1[3], 10);  
  }else{
    var ww = parseInt(a1[2], 10);
  }
  var hh = a1[0].charCodeAt(0)-64;

  var num = (hh-1)*w + ww;

  fgr.x = field.tile[num].x;
  fgr.y = field.tile[num].y;
}

// ищем X клетки
function coord_toX(crd){
  if(crd.length>3){
    var ww = parseInt(crd[2]+crd[3], 10);
  }else{
    var ww = parseInt(crd[2], 10);
  }
  
  var hh = crd[0].charCodeAt(0)-64;

  var num = (hh-1) * field.w + ww;

  return field.tile[num].x; 
}

// ищем Y клетки
function coord_toY(crd){
  if(crd.length>3){
    var ww = parseInt(crd[2]+crd[3], 10);
  }else{
    var ww = parseInt(crd[2], 10);
  }
  
  var hh = crd[0].charCodeAt(0)-64;

  var num = (hh-1) * field.w + ww;

  return field.tile[num].y; 
}

function coord_toNum(crd){
  if(crd.length>3){
    var ww = parseInt(crd[2]+crd[3], 10);
  }else{
    var ww = parseInt(crd[2], 10);
  }
  
  var hh = crd[0].charCodeAt(0)-64;

  var num = (hh-1) * field.w + ww;

  return num; 
}

//  stop
function stopTestGame(){
  field.tile.forEach(destroyerPhaserObject);
  field.txt.forEach(destroyerPhaserObject);
  for (var key in field){
    delete field.key;
  }

  clearMarkers();
  
  inv.forEach(destroyerPhaserObject);
  inv.length = 0;

  destroyerAsAr(intf);
  
}

function btExBattle(){
  stopTestGame();
  startGarage();
}

function btHello(){
  eurecaServer.say(gameId, enId, 0); // 1 hello; 2 ikillyou;
}

function destroyerPhaserObject(item, index, array){
  array[index].destroy();
}

function destroyerAsAr(array){
  for( var key in array){
    array[key].destroy();
  }
}

// РИСУЕМ КНОПКУ С ТЕКСТОМ
function addButton(bt, img, btx, bty, btt, fun, xSize, ySize){ //index, imageKey, x, y, text, function
  if(fun){
    intf[bt] = game.add.button(btx, bty, img, fun, this, 0,0,0);
  } else {
    intf[bt] = game.add.button(btx, bty, img, btPress, this, 0,0,0);
  }

  intf[bt].anchor.setTo(0.5, 0.5);
  intf[bt].onInputOver.add(btOver, intf[bt]);
  intf[bt].onInputOut.add(btOut, intf[bt]);
  intf[bt].tint = 0xeeeeee;
  //intf[bt].scale.set(mySize);  

  // TEXT ON BUTTON
  if(btt){
    var btText = bt+'T';
    intf[btText] = game.add.text(btx, bty, btt, styleButton);
    intf[btText].anchor.setTo(0.5, 0.3);
  }

  intf[bt].index = bt;

  if(xSize){
    intf[bt].width = intf[bt].width*xSize;
    intf[bt].xSize = xSize;
  } else {
    intf[bt].xSize = 1;
  }

  if(ySize){
    intf[bt].height = intf[bt].height*ySize;
    intf[bt].ySize = ySize;
  } else {
    intf[bt].ySize = 1;
  }


}


// default button and fx
function btPress(){
  console.log('DEFAULT BUTTON FUNCTION');
}

function btOver(){
  this.scale.setTo(this.xSize * 1.1, this.ySize * 1.1);
  intf[this.index+'T'].scale.set(1.1);
}

function btOut(){
  this.scale.setTo(this.xSize, this.ySize);
  intf[this.index+'T'].scale.set(1);
}

////////////////
//  ПРЕЛОАДЕР
///////////////
function togglePreloader(){
  if(preloader.bg.visible){
    preloader.bg.visible = false;
  } else {
    preloader.bg.visible = true;
  }
  game.world.bringToTop(preloader.bg);
}

/////////////////
// ПОЛЕ
/////////////////
function drawField(gField){

  //чет-нечет ширина
  var ii;
  var jj;
  var num;
  
  var w = gField.w;
  var h = gField.h;

  field.w = gField.w;
  field.h = gField.h;



  if(w%2 == 0){
    startPointX = myWidth*.625-w*30+30;
  } else {
    startPointX = myWidth*.625-w*30+30;
  }

  //чет-нечет высота
  if(h%2 ==0){
    startPointY = myHeight/2+h*30+30;    
  } else {
    startPointY = myHeight/2+h*30+30;        
  }

  //game.add.text(startPointX, startPointY, 'A');

  for(ii=1; ii<=h; ii+=1){
    for(jj=1; jj<=w; jj+=1){
      num = (ii-1)*w + jj;
      field.tile[num] = game.add.sprite(startPointX + (jj-1)*60, startPointY - (ii)*60, gField.tile[num].type, Math.abs(jj%2-ii%2));
      field.tile[num].anchor.setTo(0.5, 0.5);
      field.tile[num].coord = gField.tile[num].coord.toString();
      field.tile[num].vacant = gField.tile[num].vacant;
      field.tile[num].inputEnabled = true;
      field.tile[num].events.onInputOver.add(tileOver, field.tile[num]);
      field.tile[num].events.onInputOut.add(tileOut, field.tile[num]);
      field.tile[num].inx = num;
      /*field.tile[num].animations.add('tile');
      field.tile[num].animations.frame = num%2;
      field.tile[num].animations.paused = true;*/

      if(ii==1){
        field.txt.push(game.add.text(startPointX + (jj-1)*60, startPointY-10, jj, styleField));
        field.txt[field.txt.length-1].anchor.setTo(0.5, 0.5);
        field.txt.push(game.add.text(startPointX + (jj-1)*60, startPointY-h*60-40, jj, styleField));
        field.txt[field.txt.length-1].anchor.setTo(0.5, 0.5);
      }
    }
    field.txt.push(game.add.text(startPointX-45, startPointY-ii*60+3, String.fromCharCode(64+ii), styleField));
    field.txt[field.txt.length-1].anchor.setTo(0.5, 0.5);
    field.txt.push(game.add.text(startPointX+w*60-15, startPointY-ii*60+3, String.fromCharCode(64+ii), styleField));
    field.txt[field.txt.length-1].anchor.setTo(0.5, 0.5);
  }

}

/////////////////
// ПОЛЕ РЕВЕРС
/////////////////
function drawFieldRew(gField){
  //чет-нечет ширина
  var ii;
  var jj;
  var num;

  var w = gField.w;
  var h = gField.h;

  field.w = gField.w;
  field.h = gField.h;
  
  if(w%2 == 0){
    startPointX = myWidth*.625+w*30-30;
  } else {
    startPointX = myWidth*.625+w*30-30;
  }

  //чет-нечет высота
  if(h%2 ==0){
    startPointY = myHeight/2-h*30-30;    
  } else {
    startPointY = myHeight/2-h*30-30;        
  }

  //game.add.text(startPointX, startPointY, 'A');

  for(ii=1; ii<=h; ii+=1){
    for(jj=1; jj<=w; jj+=1){
      num = (ii-1)*w + jj;
      field.tile[num] = game.add.sprite(startPointX - (jj-1)*60, startPointY + (ii)*60, gField.tile[num].type, Math.abs(jj%2-ii%2));
      field.tile[num].anchor.setTo(0.5, 0.5);
      field.tile[num].coord = gField.tile[num].coord.toString();
      field.tile[num].vacant = gField.tile[num].vacant;
      field.tile[num].inputEnabled = true;
      field.tile[num].events.onInputOver.add(tileOver, field.tile[num]);
      field.tile[num].events.onInputOut.add(tileOut, field.tile[num]);
      field.tile[num].inx = num;
      /*field.tile[num].animations.add('tile');
      field.tile[num].animations.frame = num%2;
      field.tile[num].animations.paused = true;*/

      if(ii==1){
        field.txt.push(game.add.text(startPointX - (jj-1)*60, startPointY+20, jj, styleField));
        field.txt[field.txt.length-1].anchor.setTo(0.5, 0.5);
        field.txt.push(game.add.text(startPointX - (jj-1)*60, startPointY+h*60+50, jj, styleField));
        field.txt[field.txt.length-1].anchor.setTo(0.5, 0.5);
      }
    }
    field.txt.push(game.add.text(startPointX+45, startPointY+ii*60+3, String.fromCharCode(64+ii), styleField));
    field.txt[field.txt.length-1].anchor.setTo(0.5, 0.5);
    field.txt.push(game.add.text(startPointX-w*60+15, startPointY+ii*60+3, String.fromCharCode(64+ii), styleField));
    field.txt[field.txt.length-1].anchor.setTo(0.5, 0.5);
  }

}

function tileOver(){
  field.underCursor = this.coord;
  field.underCursorNum = coord_toNum(this.coord);
}

function tileOut(){
  field.underCursor = '';
  field.underCursorNum = '';
}


//tick
function update() {
  if(!ready) return; // окно с предложением перезагрузиться, или ожидатор соединения

  // if(preloader.bg.visible){    
  //   game.world.bringToTop(preloader.bg);
  // }

 
}


function render() {  
  game.debug.text('fps: ' + game.time.fps, myWidth*0.01, myHeight*0.05);
  game.debug.text('x: ' + Math.ceil(game.input.x/myWidth*10000)/100 + ' %;' 
                + '  y: ' + Math.ceil(game.input.y/myHeight*10000)/100+ ' %;', myWidth*0.01, myHeight*0.1);
  game.debug.text('x: ' + game.input.x + ' px;' + '  y: ' + game.input.y + ' px;', myWidth*0.01, myHeight*0.15);
  game.debug.text('tile: ' + field.underCursor  + ';' + ' num:' + field.underCursorNum, myWidth*0.01, myHeight*0.2 );
  game.debug.text('state: ' + game.gameState  + ';', myWidth*0.01, myHeight*0.25);
  //game.debug.text('map angle:' + mapAr[0].angle, 500, 32);
  //game.debug.text('time: ' + time, 500, 52);
  //game.debug.cameraInfo(game.camera, 500, 72);

}