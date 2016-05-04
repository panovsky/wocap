
// это в джсон? массив массивов.
var messages = ['Hello!', 'I kill you!', 'Not bad!', 'Worst turn!']



/////////////////////
var express = require('express'),
		app = express(app),
		server = require('http').createServer(app);

// server static files from current directory
app.use(express.static(__dirname));

//get eureca server class
//var EurecaServer = require('eureca.io').EurecaServer;
var Eureca = require('eureca.io');

//create an instance of EurecaServer
//var eurecaServer = new EurecaServer({allow:['setId', 'spawnEnemy', 'kill', 'testRemote', 'loginAnswer', 'newGame', 'chat', 'getMarkers', 'getSpawnMarkers', 'ungetMarkers', 'getFigureMove', 'getFigureAttack', 'addNewFigure', 'tgPreloader']});
var eurecaServer = new Eureca.Server({allow:['setId', 'spawnEnemy', 'kill', 'testRemote', 'loginAnswer', 'newGame', 'chat', 'getMarkers', 'getSpawnMarkers', 'ungetMarkers', 'getFigureMove', 'getFigureAttack', 'addNewFigure', 'tgPreloader']});
var clients = {};

// ОЧЕРЕДЬ
var clientsWait = [];

// ИГРЫ
var games = [];

//attach eureca.io to my http server
eurecaServer.attach(server);

/////////////////////
// MYSQL connect
/////////////////////
var mysql = require('mysql');
var dbConnection = mysql.createConnection({
  host     : 'localhost',
  user     : 'user',
  password : '1234',
  database : 'wocapdb0'
});

dbConnection.connect;

dbConnection.query('SELECT * from users', function(err, rows, fields) {
  if (!err)
    console.log('DataBase Connection done');
  else
    console.log('Error while performing Query.');
});




/////////////////////
//detect client connection
///////////////////// 
eurecaServer.onConnect( function (conn) {
	// body...
	console.log('New Client id=%s ', conn.id, conn.remoteAdress);

	//the getClient method provide a proxy allowing us to call remote client functions
    var remote = eurecaServer.getClient(conn.id);    
	
	//register the client
	clients[conn.id] = {id:conn.id, remote:remote}
		
	//call test
	remote.testRemote(conn.id);

	//here we call setId (defined in the client side)
	remote.setId(conn.id);
	

});

/////////////////////
// плаер стэйт
/////////////////////
eurecaServer.exports.playerState = function(con, state){
	var remote = eurecaServer.getClient(con);
	clients[con].state = state;
	var id = con;
	console.log('Client id = ' + con + ' : ' + clients[con].state);
	
	if(clients[con].state == 'login'){
		clients[con].baseId = null;
	}
	
	if(clients[con].state == 'wait') {
		playerChekOponent(id);
	}
}

/////////////////////
//  ОЧЕРЕДЬ И БАЛАНСЕР
/////////////////////
function playerChekOponent(id){
	if(clientsWait.length>0){
		//	BALANCER

		//	CREATE PvP
		createGame(clients[id].id, clientsWait[0].id);
		delete clientsWait[0];
		sortAndClean();


	} else {		
		clientsWait.push(clients[id]);
	}



	for(var i=0; i<clientsWait.length; i+=1){

	}
	
}

/////////////////////
// НОВАЯ ИГРА
/////////////////////
function createGame(id1, id2){
	games[id1+id2] = new Game(id1, id2);

	//	fixme вытяаскивать из БД стэк игрока
	dbGetFigure(games[id1+id2], id1, 'A:4', 'king');//генерим для первого игрока
	dbGetFigure(games[id1+id2], id1, 'B:1', 'slon');//генерим для первого игрока
	dbGetFigure(games[id1+id2], id1, '0:0', 'pawn');//генерим для первого игрока
	dbGetFigure(games[id1+id2], id1, '0:0', 'pawn');//генерим для первого игрока
	dbGetFigure(games[id1+id2], id1, '0:0', 'tower');//генерим для первого игрока
	dbGetFigure(games[id1+id2], id1, '0:0', 'horse');//генерим для первого игрока


	dbGetFigure(games[id1+id2], id2, 'D:2', 'king');//генерим для не первого игрока
	dbGetFigure(games[id1+id2], id2, 'D:3', 'slon');//генерим для не первого игрока
	dbGetFigure(games[id1+id2], id2, '0:0', 'pawn');//генерим для не первого игрока
	dbGetFigure(games[id1+id2], id2, '0:0', 'tower');//генерим для не первого игрока
	dbGetFigure(games[id1+id2], id2, '0:0', 'horse');//генерим для не первого игрока
	
	var remote =  eurecaServer.getClient(id1);
	remote.newGame(id1+id2, id2, games[id1+id2].field, games[id1+id2].turn/*, games[id1+id2].figure*/);
	
	remote = eurecaServer.getClient(id2);
	remote.newGame(id1+id2, id1, games[id1+id2].field, games[id1+id2].turn/*, games[id1+id2].figure*/);
	
}

var Game = function(id1, id2){
	this.id = id1+id2;
	this.id1 = id1;
	this.id2 = id2;
	this.turn = id1;
	this.field = new GenerateField(6, 4); // fixme юзеры выбирают размер  12*9 макс но эт дохуя
	this.figure = [];//new GenerateFigures(id1, id2);
	this.figureOnClick = null; // записываем индекс кликнутой фигуры сюда.
	this.win = null;
	this.loose = null;
	
	// ФИГУРЫ
	//for(var i=1; i<=this.field.w){
	//}
}

////////////////////
// ГЕНЕРАЦИЯ ПОЛЯ
/////////////////////
var GenerateField = function(w, h){
	this.w = w;
	this.h = h;
	this.tile = [];

	// старты генерить надо где-то не тут

	for(var hh=1; hh<=this.h; hh+=1){//СТОЛБЦЫ
		for(var ww=1; ww<=this.w; ww+=1){//СТРОКИ
			var num = (hh-1)*w + ww;
			this.tile[num] = {};
			this.tile[num].inx = num;
			this.tile[num].coord = String.fromCharCode(64+hh);
			this.tile[num].coord += ':' + ww.toString();
			this.tile[num].vacant = null;
			this.tile[num].figInx = null;

			var killMe = Math.ceil(Math.random()*3); // fixme не рандом!
			if(hh==1 && ww==1){
				this.tile[num].type = 'tileGold'; //fixme брать из базы степь, лес, проч (см заметку в айфоне)								
			} else if(hh==this.h && ww==this.w){
				this.tile[num].type = 'tileGold';
			} else if(killMe < 2){ 
				this.tile[num].type = 'tileGrass';
			} else if(killMe<3) {
				this.tile[num].type = 'tileStone';
			} else {
				this.tile[num].type = 'tileForest';
			}
			this.tile[num].info = 'Информация'; //fixme too
			this.tile[num].bonus = 'пока хз как реализовать, видимо тупo CASE';

			
		}
		//...
	}
}

/////////////////////
// ФИГУРЫ 
/////////////////////
var GenerateFigures = function(gm, idd, crd, figTmp){ //gameId, playerId, coordinates

	//	fixme тип фигуры передааать в фции из резерва игрока для данного героя (звучит пздц кнеш)

	
	
	//для каждого генерим по очереди
	// fixme видимо будем всё брать из базы. Если это король - ставим на поле, остальных в резерв
	gm.figure.push({});
	// инфа 
	gm.figure[gm.figure.length-1].inx = gm.figure.length-1;
	gm.figure[gm.figure.length-1].id = idd;

	// 	БАЗА
	gm.figure[gm.figure.length-1].type = figTmp.Type; // спрайт
	gm.figure[gm.figure.length-1].lifeTime = figTmp.LifeTime; //уменьшаем каждый ход если ==0, писец фигуре
	gm.figure[gm.figure.length-1].friendBonusActive = figTmp.FriendBonusActive; // тыкаем на своих
	gm.figure[gm.figure.length-1].friendBonusActiveMatrix = figTmp.FriendBonusActiveMatrix; // тыкаем на своих везде? ненужный аттрибут
	gm.figure[gm.figure.length-1].friendBonusPassive = figTmp.FriendBonusPassive; // стоим рядом
	// ттх БАЗА
	gm.figure[gm.figure.length-1].cost = figTmp.Cost;
	gm.figure[gm.figure.length-1].attack = figTmp.Attack;
	gm.figure[gm.figure.length-1].health = figTmp.Health;
	gm.figure[gm.figure.length-1].moveRadius = figTmp.MoveRadius; //fixme ballancer, plz
	gm.figure[gm.figure.length-1].moveMatrix = figTmp.MoveMatrix; 

	gm.figure[gm.figure.length-1].coord = crd; //фигура на поле, else '0:0'
	if(gm.figure[gm.figure.length-1].coord != '0:0'){
		toggleVacant(gm.id, gm.figure[gm.figure.length-1].coord, idd, gm.figure.length-1);
	} else {
		//	nothin?
	}
	
	gm.figure[gm.figure.length-1].onClick = false; 
	
	// ттх бонусы
	gm.figure[gm.figure.length-1].costMult = 1;
	gm.figure[gm.figure.length-1].attackPlus = 0;
	gm.figure[gm.figure.length-1].attackMult = 1;
	gm.figure[gm.figure.length-1].healthPlus = 0;
	gm.figure[gm.figure.length-1].healthMult = 1;

	//	стоимость в магазе, опыт, ссыльСпрайт, ссыльПревью, описание Ру


	//...
	var remote =  eurecaServer.getClient(gm.id1);
	remote.addNewFigure(gm.figure[gm.figure.length-1], gm.field);
	
	remote =  eurecaServer.getClient(gm.id2);
	remote.addNewFigure(gm.figure[gm.figure.length-1], gm.field);
	

}



// Активация фигуры
eurecaServer.exports.activateFigure = function(gId, idd, inx){
	
	var remote =  eurecaServer.getClient(idd);

	//проверка хода 	fixme проверять не поклиентскому айди, а по серверному
	if(idd != games[gId].turn){
		return;
	}



	// принажатии на активную фигуру - деактиваци
	if(games[gId].figureOnClick == inx){
		remote.ungetMarkers();
		games[gId].markers.length = 0;
		games[gId].figureOnClick = null;
		return;
	}

	// деактивация активной фигуры (усли таковая есть) 
	if(games[gId].figureOnClick != null){
		remote.ungetMarkers();
		games[gId].markers.length = 0;
		games[gId].figureOnClick = null;
		
	}
	
	var fig = games[gId].figure[inx];
	games[gId].figureOnClick = inx;

	//чистим массив маркеров
	if(!games[gId].markers){
		games[gId].markers = [];
	}
	games[gId].markers.length = 0;


	if(fig.coord == '0:0'){ //фигура не на поле. предлагаем спаун в первую линию
		addSpawnMarkers(gId, fig, games[gId].markers, idd);
		remote.getSpawnMarkers(games[gId].markers);
	} else { // иначе смотрим матрицу движения
		switch (fig.moveMatrix) { // кто блять придумал синтаксис свитча? ни раздела строк, нихуя бля! чорт ногу сломит
			case 'P':
				moveMatrixP(gId, fig, games[gId].markers)
				break
			case 'O': 
				moveMatrixO(gId, fig, games[gId].markers)
				break
			case 'X': 
				moveMatrixX(gId, fig, games[gId].markers)
				break
			case 'I': 
				moveMatrixI(gId, fig, games[gId].markers)
				break
			case 'F': 
				moveMatrixF(gId, fig, games[gId].markers)
				break
		}
		remote.getMarkers(games[gId].markers);
	}


	
}

//////////////////////////////////////
//	МАРКЕРЫ СПАВНА // fixme считать количство фигур на поле? если максимум игрока достигнут-спавнить низя
/////////////////////////////////////
function addSpawnMarkers(gId, fig, result, idd){
	var ww = games[gId].field.w;
	var hh = games[gId].field.h;

	for(var ii=1; ii<=ww; ii+=1){
		if(idd == games[gId].id1){
			var crd = 'A:'+ii; 
		} else if(idd == games[gId].id2){
			var crd = String.fromCharCode(62+ww) + ':' + ii;
			//console.log(crd);
		}
		if(games[gId].field.tile[coord_toInx(crd, ww, hh)].vacant == null){ // клэтка свободна?
			result.push({});
			result[result.length-1].coord = crd;
			result[result.length-1].type = 'move';
			result[result.length-1].vector = 'l';
		}
	}
}

//////////////////////////////////////
//	MOVE MATRIX матрица хода
//////////////////////////////////////

//  матрица хода О
function moveMatrixO(gId, fig, result){
	var ww = games[gId].field.w;
	var hh = games[gId].field.h;
	
	//var num = coord_toInx(fig.coord, ww, hh);

	if(fig.coord.length>3){
		var gorz=parseInt(fig.coord[2]+fig.coord[3], 10);
	} else {
		var gorz=parseInt(fig.coord[2], 10);
	}

	var vert =  fig.coord[0].charCodeAt(0)-64;


	//	fixme много одинакового кодаа! Зафигачить фцию и нырять в неё
	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(gorz+rr <= ww){//справа
			result.push({});
			result[result.length-1].coord = (fig.coord[0] + ':' + (gorz+rr).toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'r';//для передвижения этот параметр не обязателен. только для атаки/помогаки
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 90;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 270;
				}
			} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'r';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'r';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(gorz-rr >= 1){//слева
			result.push({});
			result[result.length-1].coord = (fig.coord[0] + ':' + (gorz-rr).toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'l';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 270;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 90;
				} 
			} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'l';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'l';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(vert+rr <= hh){//сверху
			result.push({});
			result[result.length-1].coord = (String.fromCharCode(64+vert+rr) + ':' + gorz.toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'u';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 0;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 180;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'u';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'u';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(vert-rr >= 1){//снизу
			result.push({});
			result[result.length-1].coord = (String.fromCharCode(64+vert-rr) + ':' + gorz.toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'd';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 180;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 0;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'd';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'd';
				break;
			}
		}
	}



	//диагональ 
	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz+rr <= ww && vert+rr <= hh){//справа верх
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert+rr) + ':' + (gorz+rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'ru';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 45;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 225;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'ru';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'ru';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz-rr >= 1 && vert+rr <= hh){//слева верх
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert+rr) + ':' + (gorz-rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'lu';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 315;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 135;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'lu';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'lu';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz-rr >= 1 && vert-rr >= 1){//слева низ
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert-rr) + ':' + (gorz-rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'ld';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 225;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 45;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'ld';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'ld';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz+rr <= ww && vert-rr >= 1){//справа низ
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert-rr) + ':' + (gorz+rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'rd';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 135;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 315;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'rd';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'rd';
				break;
			}
		}
	}

}

//  матрица хода I
function moveMatrixI(gId, fig, result){
	var ww = games[gId].field.w;
	var hh = games[gId].field.h;
	
	//var num = coord_toInx(fig.coord, ww, hh);

	if(fig.coord.length>3){
		var gorz=parseInt(fig.coord[2]+fig.coord[3], 10);
	} else {
		var gorz=parseInt(fig.coord[2], 10);
	}

	var vert =  fig.coord[0].charCodeAt(0)-64;


	//	fixme много одинакового кодаа! Зафигачить фцию и нырять в неё
	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(gorz+rr <= ww){//справа
			result.push({});
			result[result.length-1].coord = (fig.coord[0] + ':' + (gorz+rr).toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'r';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 90;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 270;
				}
			} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'r';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'r';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(gorz-rr >= 1){//слева
			result.push({});
			result[result.length-1].coord = (fig.coord[0] + ':' + (gorz-rr).toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'l';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 270;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 90;
				} 
			} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'l';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'l';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(vert+rr <= hh){//сверху
			result.push({});
			result[result.length-1].coord = (String.fromCharCode(64+vert+rr) + ':' + gorz.toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'u';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 0;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 180;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'u';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'u';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(vert-rr >= 1){//снизу
			result.push({});
			result[result.length-1].coord = (String.fromCharCode(64+vert-rr) + ':' + gorz.toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'd';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 180;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 0;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'd';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'd';
				break;
			}
		}
	}

}

//	матрица хода X
function moveMatrixX(gId, fig, result){
	var ww = games[gId].field.w;
	var hh = games[gId].field.h;
	
	//var num = coord_toInx(fig.coord, ww, hh);

	if(fig.coord.length>3){
		var gorz=parseInt(fig.coord[2]+fig.coord[3], 10);
	} else {
		var gorz=parseInt(fig.coord[2], 10);
	}

	var vert =  fig.coord[0].charCodeAt(0)-64;

	//диагональ 
	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz+rr <= ww && vert+rr <= hh){//справа верх
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert+rr) + ':' + (gorz+rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'ru';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 45;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 225;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'ru';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'ru';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz-rr >= 1 && vert+rr <= hh){//слева верх
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert+rr) + ':' + (gorz-rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'lu';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 315;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 135;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'lu';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'lu';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz-rr >= 1 && vert-rr >= 1){//слева низ
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert-rr) + ':' + (gorz-rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'ld';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 225;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 45;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'ld';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'ld';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz+rr <= ww && vert-rr >= 1){//справа низ
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert-rr) + ':' + (gorz+rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'rd';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 135;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 315;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'rd';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'rd';
				break;
			}
		}
	}

}

//	матрица хода P
function moveMatrixP(gId, fig, result){
	var ww = games[gId].field.w;
	var hh = games[gId].field.h;
	
	//var num = coord_toInx(fig.coord, ww, hh);

	if(fig.coord.length>3){
		var gorz=parseInt(fig.coord[2]+fig.coord[3], 10);
	} else {
		var gorz=parseInt(fig.coord[2], 10);
	}

	var vert =  fig.coord[0].charCodeAt(0)-64;


	//	fixme много одинакового кодаа! Зафигачить фцию и нырять в неё
	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(gorz+rr <= ww){//справа
			result.push({});
			result[result.length-1].coord = (fig.coord[0] + ':' + (gorz+rr).toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'r';//для передвижения этот параметр не обязателен. только для атаки/помогаки
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 90;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 270;
				}
			} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				// result[result.length-1].type = 'support'; 
				// result[result.length-1].vector = 'r';
				break;
			} else {
				// result[result.length-1].type = 'attack';
				// result[result.length-1].vector = 'r';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(gorz-rr >= 1){//слева
			result.push({});
			result[result.length-1].coord = (fig.coord[0] + ':' + (gorz-rr).toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'l';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 270;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 90;
				} 
			} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				// result[result.length-1].type = 'support'; 
				// result[result.length-1].vector = 'l';
				break;
			} else {
				// result[result.length-1].type = 'attack';
				// result[result.length-1].vector = 'l';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(vert+rr <= hh){//сверху
			result.push({});
			result[result.length-1].coord = (String.fromCharCode(64+vert+rr) + ':' + gorz.toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'u';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 0;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 180;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				// result[result.length-1].type = 'support'; 
				// result[result.length-1].vector = 'u';
				break;
			} else {
				// result[result.length-1].type = 'attack';
				// result[result.length-1].vector = 'u';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){ 
		if(vert-rr >= 1){//снизу
			result.push({});
			result[result.length-1].coord = (String.fromCharCode(64+vert-rr) + ':' + gorz.toString());
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				result[result.length-1].type = 'move';
				result[result.length-1].vector = 'd';
				if(fig.id == games[gId].id1){
					result[result.length-1].angle = 180;					
				} else if(fig.id == games[gId].id2){
					result[result.length-1].angle = 0;
				}
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				// result[result.length-1].type = 'support'; 
				// result[result.length-1].vector = 'd';
				break;
			} else {
				// result[result.length-1].type = 'attack';
				// result[result.length-1].vector = 'd';
				break;
			}
		}
	}



	//диагональ 
	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz+rr <= ww && vert+rr <= hh){//справа верх
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert+rr) + ':' + (gorz+rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				 
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'ru';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'ru';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz-rr >= 1 && vert+rr <= hh){//слева верх
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert+rr) + ':' + (gorz-rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				 
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'lu';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'lu';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz-rr >= 1 && vert-rr >= 1){//слева низ
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert-rr) + ':' + (gorz-rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				 
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'ld';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'ld';
				break;
			}
		}
	}

	for(var rr = 1; rr<= fig.moveRadius; rr+=1){
		if(gorz+rr <= ww && vert-rr >= 1){//справа низ
			result.push({});
			result[result.length-1].coord = String.fromCharCode(64+vert-rr) + ':' + (gorz+rr).toString();
			if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//пиздец каой
				 
			}else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
				result[result.length-1].type = 'support'; 
				result[result.length-1].vector = 'rd';
				break;
			} else {
				result[result.length-1].type = 'attack';
				result[result.length-1].vector = 'rd';
				break;
			}
		}
	}

}

//	матрица хода F (uur, urr, drr, ddr, ddl, dll, ull, uul), vector? radius?
function moveMatrixF(gId, fig, result){
	var ww = games[gId].field.w;
	var hh = games[gId].field.h;
	
	//var num = coord_toInx(fig.coord, ww, hh);

	if(fig.coord.length>3){
		var gorz=parseInt(fig.coord[2]+fig.coord[3], 10);
	} else {
		var gorz=parseInt(fig.coord[2], 10);
	}

	var vert =  fig.coord[0].charCodeAt(0)-64;

	// fixme люто задуматься о радиусе коняги

	//uur
	if(gorz+1 <= ww && vert+2 <= hh){
		result.push({});
		result[result.length-1].coord = (String.fromCharCode(64+vert+2) + ':' + (gorz+1).toString());

		if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
			result[result.length-1].type = 'move';
			result[result.length-1].vector = 'uur';//для передвижения этот параметр не обязателен. только для атаки/помогаки
			if(fig.id == games[gId].id1){
				result[result.length-1].angle = 0;					
			} else if(fig.id == games[gId].id2){
				result[result.length-1].angle = 180;
			}
		} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
			// result[result.length-1].type = 'support'; 
			// result[result.length-1].vector = 'uur';
			//break;
		} else {
			result[result.length-1].type = 'attack';
			result[result.length-1].vector = 'uur';
			//break;
		}
	}

	//urr
	if(gorz+2 <= ww && vert+1 <= hh){
		result.push({});
		result[result.length-1].coord = (String.fromCharCode(64+vert+1) + ':' + (gorz+2).toString());

		if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
			result[result.length-1].type = 'move';
			result[result.length-1].vector = 'urr';//для передвижения этот параметр не обязателен. только для атаки/помогаки
			if(fig.id == games[gId].id1){
				result[result.length-1].angle = 0;					
			} else if(fig.id == games[gId].id2){
				result[result.length-1].angle = 180;
			}
		} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
			// result[result.length-1].type = 'support'; 
			// result[result.length-1].vector = 'urr';
			//break;
		} else {
			result[result.length-1].type = 'attack';
			result[result.length-1].vector = 'urr';
			//break;
		}
	}

	//drr
	if(gorz+2 <= ww && vert-1 >= 1){
		result.push({});
		result[result.length-1].coord = (String.fromCharCode(64+vert-1) + ':' + (gorz+2).toString());

		if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
			result[result.length-1].type = 'move';
			result[result.length-1].vector = 'urr';//для передвижения этот параметр не обязателен. только для атаки/помогаки
			if(fig.id == games[gId].id1){
				result[result.length-1].angle = 0;					
			} else if(fig.id == games[gId].id2){
				result[result.length-1].angle = 180;
			}
		} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
			// result[result.length-1].type = 'support'; 
			// result[result.length-1].vector = 'urr';
			//break;
		} else {
			result[result.length-1].type = 'attack';
			result[result.length-1].vector = 'urr';
			//break;
		}
	}

	//ddr
	if(gorz+1 <= ww && vert-2 >= 1){
		result.push({});
		result[result.length-1].coord = (String.fromCharCode(64+vert-2) + ':' + (gorz+1).toString());

		if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
			result[result.length-1].type = 'move';
			result[result.length-1].vector = 'urr';//для передвижения этот параметр не обязателен. только для атаки/помогаки
			if(fig.id == games[gId].id1){
				result[result.length-1].angle = 0;					
			} else if(fig.id == games[gId].id2){
				result[result.length-1].angle = 180;
			}
		} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
			// result[result.length-1].type = 'support'; 
			// result[result.length-1].vector = 'urr';
			//break;
		} else {
			result[result.length-1].type = 'attack';
			result[result.length-1].vector = 'urr';
			//break;
		}
	}

	//ddl
	if(gorz-1 >= 1 && vert-2 >= 1){
		result.push({});
		result[result.length-1].coord = (String.fromCharCode(64+vert-2) + ':' + (gorz-1).toString());

		if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
			result[result.length-1].type = 'move';
			result[result.length-1].vector = 'urr';//для передвижения этот параметр не обязателен. только для атаки/помогаки
			if(fig.id == games[gId].id1){
				result[result.length-1].angle = 0;					
			} else if(fig.id == games[gId].id2){
				result[result.length-1].angle = 180;
			}
		} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
			// result[result.length-1].type = 'support'; 
			// result[result.length-1].vector = 'urr';
			//break;
		} else {
			result[result.length-1].type = 'attack';
			result[result.length-1].vector = 'urr';
			//break;
		}
	}

	//dll
	if(gorz-2 >= 1 && vert-1 >= 1){
		result.push({});
		result[result.length-1].coord = (String.fromCharCode(64+vert-1) + ':' + (gorz-2).toString());

		if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
			result[result.length-1].type = 'move';
			result[result.length-1].vector = 'urr';//для передвижения этот параметр не обязателен. только для атаки/помогаки
			if(fig.id == games[gId].id1){
				result[result.length-1].angle = 0;					
			} else if(fig.id == games[gId].id2){
				result[result.length-1].angle = 180;
			}
		} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
			// result[result.length-1].type = 'support'; 
			// result[result.length-1].vector = 'urr';
			//break;
		} else {
			result[result.length-1].type = 'attack';
			result[result.length-1].vector = 'urr';
			//break;
		}
	}

	//ull
	if(gorz-2 >= 1 && vert+1 <= hh){
		result.push({});
		result[result.length-1].coord = (String.fromCharCode(64+vert+1) + ':' + (gorz-2).toString());

		if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
			result[result.length-1].type = 'move';
			result[result.length-1].vector = 'urr';//для передвижения этот параметр не обязателен. только для атаки/помогаки
			if(fig.id == games[gId].id1){
				result[result.length-1].angle = 0;					
			} else if(fig.id == games[gId].id2){
				result[result.length-1].angle = 180;
			}
		} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
			// result[result.length-1].type = 'support'; 
			// result[result.length-1].vector = 'urr';
			//break;
		} else {
			result[result.length-1].type = 'attack';
			result[result.length-1].vector = 'urr';
			//break;
		}
	}

	//uul
	if(gorz-1 >= 1 && vert+2 <= hh){
		result.push({});
		result[result.length-1].coord = (String.fromCharCode(64+vert+2) + ':' + (gorz-1).toString());

		if( games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == null){//fixme вывести в консоль и глянуть 
			result[result.length-1].type = 'move';
			result[result.length-1].vector = 'urr';//для передвижения этот параметр не обязателен. только для атаки/помогаки
			if(fig.id == games[gId].id1){
				result[result.length-1].angle = 0;					
			} else if(fig.id == games[gId].id2){
				result[result.length-1].angle = 180;
			}
		} else if(games[gId].field.tile[coord_toInx(result[result.length-1].coord, ww, hh)].vacant == fig.id) {
			// result[result.length-1].type = 'support'; 
			// result[result.length-1].vector = 'urr';
			//break;
		} else {
			result[result.length-1].type = 'attack';
			result[result.length-1].vector = 'urr';
			//break;
		}
	}

}

//////////////////
//	ПЕРЕКЛ ХОДА
/////////////////

function nextTurn(gId){
	if(games[gId].turn == games[gId].id1){
		games[gId].turn = games[gId].id2;
	} else if(games[gId].turn == games[gId].id2){
		games[gId].turn = games[gId].id1;
	}
}

// координаты в индекс
function coord_toInx(a1, w, h){

  if(a1.length>3){
    var ww = parseInt(a1[2]+a1[3], 10);  
  }else{
    var ww = parseInt(a1[2], 10);
  }
  var hh = a1[0].charCodeAt(0)-64;

  return (hh-1)*w + ww;

}

// переключение клетка свободна/нет прописываем в клетку индекс фигуры
function toggleVacant(gId, coord, idd, figInx){
	var num = coord_toInx(coord, games[gId].field.w, games[gId].field.h);

	if(games[gId].field.tile[num].vacant == null){ //fixme булёвы заменить на null/id1/id2
		games[gId].field.tile[num].vacant = idd;
		games[gId].field.tile[num].figInx = figInx;
	} else if(games[gId].field.tile[num].vacant == idd) {
		games[gId].field.tile[num].vacant = null; //если наступаешь на фигуру, вызывать ф-цию 2 раза?
		games[gId].field.tile[num].figInx = null;
	} else {
		games[gId].field.tile[num].vacant = idd;
		games[gId].field.tile[num].figInx = figInx;
	}
	
}

///////////////////////
//	ФИГУРЫ - ЭКШОН
///////////////////////
eurecaServer.exports.mrkDown = function(gId, idd, inx){
	
	var remote =  eurecaServer.getClient(idd);
	remote.ungetMarkers();

	// fixme проверка на тип маркера нужна if(markers[inx].type == 'move') итэдэ

	if(games[gId].markers[inx].type == 'move'){
		if(games[gId].figure[games[gId].figureOnClick].coord != '0:0'){
			toggleVacant(gId, games[gId].figure[games[gId].figureOnClick].coord, idd, games[gId].figureOnClick);//освобождаем
		}
		toggleVacant(gId, games[gId].markers[inx].coord, idd, games[gId].figureOnClick);//занимаем

		games[gId].figure[games[gId].figureOnClick].coord = games[gId].markers[inx].coord;
		
		remote = eurecaServer.getClient(games[gId].id1);
		remote.getFigureMove(games[gId].figureOnClick, games[gId].markers[inx].coord);
		
		remote = eurecaServer.getClient(games[gId].id2);
		remote.getFigureMove(games[gId].figureOnClick, games[gId].markers[inx].coord);

	} else if(games[gId].markers[inx].type == 'support'){
		// оттут пока хз. как вариант - убрать пока из клиента
	} else if(games[gId].markers[inx].type == 'attack'){
		//считаем атаку-защищаку
		var attInx = games[gId].figureOnClick; //inx 1
		var defInx = games[gId].field.tile[coord_toInx(games[gId].markers[inx].coord, games[gId].field.w, games[gId].field.h)].figInx; //inx2

		//	уменьшаем хп
		games[gId].figure[defInx].health -= games[gId].figure[attInx].attack;
		
		if(games[gId].figure[attInx].type != 'pawn') {
			games[gId].figure[attInx].health -= games[gId].figure[defInx].attack;
		}

		// схороняем координаты защищающещщящящ - пригодятся
		var defTempCoord = games[gId].figure[defInx].coord;

		//проверяем умер или нет атакующий, и второй

		if(games[gId].figure[attInx].health<=0){
			killFigure(gId, attInx);
		} else if(games[gId].figure[defInx].health<=0){
			toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick);
		 	killFigure(gId, defInx);
			games[gId].figure[attInx].coord = defTempCoord;
			toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); 
		} else {
			//	врубать это только если юнит ближнего боя
			var tc = games[gId].figure[defInx].coord
			 
			switch (games[gId].markers[inx].vector) { // кто блять придумал синтаксис свитча? ни раздела строк, нихуя бля! чорт ногу сломит
				case 'r': 
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //освобожд

					if(tc.length>3){//	предусмотреть двузначное число
						games[gId].figure[attInx].coord = tc[0]+tc[1]+ (parseInt(tc[2]+tc[3], 10)-1).toString();
					} else {						
						games[gId].figure[attInx].coord = tc[0]+tc[1]+ (parseInt(tc[2], 10)-1).toString();
					}

					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //занимаем
					// перекл клэтки
					break

				case 'l': 
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //освобожд

					if(tc.length>3){//	предусмотреть двузначное число
						games[gId].figure[attInx].coord = tc[0]+tc[1]+ (parseInt(tc[2]+tc[3], 10)+1).toString();
					} else {						
						games[gId].figure[attInx].coord = tc[0]+tc[1]+ (parseInt(tc[2], 10)+1).toString();
					}
					
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //занимаем
					// перекл клэтки
					break

				case 'u': 
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //освобожд
					
					if(tc.length>3){
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)-1)+tc[1]+tc[2]+tc[3];
					}else {
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)-1)+tc[1]+tc[2];
						
					}
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //занимаем
					break 

				case 'd': 
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //освобожд
					
					if(tc.length>3){
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)+1)+tc[1]+tc[2]+tc[3];
					}else {
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)+1)+tc[1]+tc[2];
						
					}
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //занимаем
					break
				case 'ru':
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //освобожд
					
					if(tc.length>3){
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)-1)+tc[1]+(parseInt(tc[2]+tc[3], 10)-1).toString();
					}else {
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)-1)+tc[1]+(parseInt(tc[2], 10)-1).toString();
						
					}
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //занимаем
					break 
				case 'lu':
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //освобожд
					
					if(tc.length>3){
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)-1)+tc[1]+(parseInt(tc[2]+tc[3], 10)+1).toString();
					}else {
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)-1)+tc[1]+(parseInt(tc[2], 10)+1).toString();
						
					}
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //занимаем
					break 
				case 'rd':
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //освобожд
					
					if(tc.length>3){
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)+1)+tc[1]+(parseInt(tc[2]+tc[3], 10)-1).toString();
					}else {
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)+1)+tc[1]+(parseInt(tc[2], 10)-1).toString();
						
					}
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //занимаем
					break 
				case 'ld':
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //освобожд
					
					if(tc.length>3){
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)+1)+tc[1]+(parseInt(tc[2]+tc[3], 10)+1).toString();
					}else {
						games[gId].figure[attInx].coord = String.fromCharCode(tc[0].charCodeAt(0)+1)+tc[1]+(parseInt(tc[2], 10)+1).toString();
						
					}
					toggleVacant(gId, games[gId].figure[attInx].coord, idd, games[gId].figureOnClick); //занимаем
					break 
			}
		}

		

		
		

		//	fixme координаты забыл передать, ёбана! В getFigureAttack  проверять координаты прост, и выполнять две анимации
		remote = eurecaServer.getClient(games[gId].id1);
		remote.getFigureAttack(attInx, games[gId].figure[attInx].coord, games[gId].figure[attInx].health, defInx, games[gId].figure[defInx].coord, games[gId].figure[defInx].health, defTempCoord);
		
		remote = eurecaServer.getClient(games[gId].id2);
		remote.getFigureAttack(attInx, games[gId].figure[attInx].coord, games[gId].figure[attInx].health, defInx, games[gId].figure[defInx].coord, games[gId].figure[defInx].health, defTempCoord);
		
	}

	games[gId].markers.length = 0;
	games[gId].figureOnClick = null;

	nextTurn(gId);

}

//	ШМЕРТЬ
function killFigure(gId, inx){
	//	освободить клэтку
	toggleVacant(gId, games[gId].figure[inx].coord, games[gId].figure[inx].id, inx);

	//	координаты в 0:0
	games[gId].figure[inx].coord = '0:0';

	//	объяснить клиенту, что фигура мертва // нужна последовательность

	//это король? победа-непобеда
	if(games[gId].figure[inx].type == 'king'){
		idd = games[gId].figure[inx].id;
		if(idd == games[gId].id1){
			games[gId].loose = games[gId].id1;
			games[gId].win = games[gId].id2;
			//console.log('победил 2й');
		} else if(idd == games[gId].id2){
			games[gId].loose = games[gId].id2;
			games[gId].win = games[gId].id1;			
			//console.log('победил 1й');
		}

	}
}



/////////////////////
// SORT AND CLEAN WAIT ARRAY
/////////////////////
function sortAndClean(){
	clientsWait.length = 0; // fixme охуеть как фикс ми!
}

/////////////////////
// CHAT
/////////////////////
eurecaServer.exports.say = function(gId, enId, msg){	
	var remote = eurecaServer.getClient(enId)
	remote.chat(messages[msg]);// fixme / from db or JSON
}

/////////////////////
//detect client disconnection
/////////////////////
eurecaServer.onDisconnect(function (conn){
	// body...
	console.log('Client disconnected', conn.id);

	var removeId = clients[conn.id].id;
	
	delete clients[conn.id];
	
	for (var c in clients)
	{
		var remote = clients[c].remote;
		
		//here we call kill() method defined in the client side
		remote.kill(conn.id);
	}
});

/////////////////////
// пустая херь пока
/////////////////////
eurecaServer.exports.handshake = function(){
	//var conn = this.connection;
	for (var c in clients)
	{
		var remote = clients[c].remote;
		for (var cc in clients)
		{		
			remote.spawnEnemy(clients[cc].id, 0, 0);		
		}
	}
}

/////////////////////
// DATABASE get FIGURE
/////////////////////
dbGetFigure = function (gm, idd, crd, type){ // сюда пихаем создание фигуры и только после этого взываем к клиенту.
	

	dbConnection.query('SELECT * from pieces WHERE Type = '+ '"' + type + '"', function(err, rows){
				
		GenerateFigures(gm, idd, crd, rows[0]);
		
	});
}


/////////////////////
// DATABASE чек по ЕМАЙЛу
/////////////////////
eurecaServer.exports.checkLogin = function(con, eml, pwd){
	console.log(eml + ' : ' + pwd);
	var remote = eurecaServer.getClient(con);

	//dbConnection.connect;
	dbConnection.query('SELECT * from users WHERE mail = '+ '"' + eml + '"', function(err, rows) {
		if(rows.length != 0){
	    	console.log(rows[0].mail);
	    	if(rows[0].pass == pwd){
	    		clients[con].baseId = rows.id;
	    		console.log('password right');
	    		remote.loginAnswer('yes');
	    		//return('yes');
	    	} else {
				console.log('Wrong password or email');
				//return('Wrong password or email');
				remote.loginAnswer('nope');
	    	}

		} else {
			console.log('Wrong password or email');
			//return('Wrong password or email');
			remote.loginAnswer('nope');
		}
		
	});
	//dbConnection.end(); // fixme крашится при этом почемуто бля

}



server.listen(8000); //8080 наверн, как везде? or not?