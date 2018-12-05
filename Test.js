/**
 * 
 */

// array of already found views
var views = [];

// array of view which has any children
var parentViews = [];

var error = null;

// loaded data
var content = "";

// number of DOM modifications
var modifiedCout = 0;


// mutationObserver for observing changes inside DOM
var config = { attributes: true, childList: true, characterData: true, subtree: true, attributeOldValue: true, characterDataOldValue: true};
var callback = function(mutationsList) {
	mutationsList.forEach(function(mutation) {
		modifiedCout++
	});
};
var observer = new MutationObserver(callback);
observer.observe(document.body, config);

//class which represents one view
class View{
	constructor(value){	
		this.name = View.createName(value);
		this.name += "_" + views.length;
		this.value = value;
		this.used = false;
		this.up = null;
		this.down = null;
		this.right = null;
		this.left = null;
		this.enter = null;
		this.back = null;
	}
	
	static createName(element){
		if(element == null){
			return "end";
		}
		var name = "";
		name += element.innerText
		if(name == ""){
			name = element.dataset.title;
		}
		name = name.replace(/\s/g, '');
		name = name.replace(/[^a-zA-Z0-9]/g, '');
		return name;
	}
	
	getElementByDirection(direction){
		switch(direction){
			case "up": return this.up; break;
			case "down": return this.down; break;
			case "left": return this.left; break;
			case "right": return this.right; break;
			case "enter": return this.enter; break;
			default: return null;
		}
	}
	
	copy(){
		var copy = new View();
		copy.name = this.name;
		copy.value = this.value;
		copy.used = this.used;
		copy.up = this.up;
		copy.down = this.down;
		copy.right = this.right;
		copy.left = this.left;
		copy.enter = this.enter;
		copy.back = this.back;
		return copy;
	}
}

//class which represents one test case, it consists of moves.
class TestCase{
	constructor(id, content){
		this.id = id;
		this.start = this.parseContent(content);
		this.isOk = true;
	}
	
	//parses loaded data and creates moves
	parseContent(content){
		content = content.replace(/\s/g, '');
		var moves = content.split("-");
		var start = null;
		var oldMove = null;
		for(var i=1; i<moves.length; i++){
			var move = new Move(moves[i]);
			if(start == null){
				start = move;
				oldMove = start;
			}
			else{
				oldMove.setNextMove(move);
				move.setLastMove(oldMove);
				oldMove = move;
			}
		}
		return start;
	}
	
	fail(){
		this.isOk = false;
	}
}

//class which represents one move
class Move{
	constructor(informations){
		informations = informations.split("_");
		this.name = informations[0];
		this.id = informations[1];
		this.direction = informations[2];
		this.nextMove = null;
		this.lastMove = null;
		this.error = null;
	}
	
	setNextMove(nextMove){
		this.nextMove = nextMove;
	}
	
	setLastMove(lastMove){
		this.lastMove = lastMove;
	}
	
	setError(error){
		this.error = error;
	}
}

// it reads file from external storage removable_sda1
function readFile(fileName){	
	return new Promise((resolve,reject) =>{ 
		tizen.filesystem.resolve(
			'removable_sda1',
			  function(obj) {
					var folder_obj;
					folder_obj = obj;
					if(folder_obj){
						var file_obj = folder_obj.resolve(fileName);
						if(file_obj != null){
							file_obj.openStream(
								    'r',
								    function(fs){
								    	fs.position = 0;
								        content = fs.read(fs.bytesAvailable);
								        fs.close();
								        resolve();
								    },
								    function(error) {
								      console.log(JSON.stringify(error));
								      reject();
								    }
								  );
						}
					}
			  },
			  function(error) {
			    console.log(JSON.stringify(error));
			    reject();
			  },
			  'rw');
	});
}

// it reads json file with test cases
async function readTestCases(fileName){
	var testCases = [];
	content = "";
	await readFile(fileName + '.json').then(function(){
		var tests = JSON.parse(content);
		console.log(tests);
		tests = tests.test_situations.test_situation;
		testCases = [];
		for(var i=0; i<tests.length; i++){
			testCases.push(new TestCase(i, tests[i].content));
		}
		if(testCases.length == 0){
			testCases.push(new TestCase(0, tests.content));
		}
	});
	return testCases
}

// it reads csv file with model
async function readModel(fileName){
	var edges = [];
	views = [];
	content = "";
	await readFile(fileName + '.csv').then(function(){
		let rows = content.replace(/\r\n|\n\r|\n|\r/g,"\n").split("\n");
		edges = rows[0].split(';');
		edges.splice(0, 2);
		rows.splice(0, 2);
		for(var i=0; i<rows.length; i++){
			if(rows[i]!=""){
				rows[i] = rows[i].split(';');
				let node = new View();
				node.name = rows[i][0];
				views.push(node);
			}
		}
		for(var i=0; i<rows.length; i++){
			for (var j = 2; j < rows[i].length; j++) {
				if(rows[i][j] != '-'){
					let direction = edges[j-2].split('_');
					direction = direction[2];
					for(var k=0; k<views.length; k++){
						if(views[k].name == rows[i][j]){
							switch(direction){
								case "left": 
									views[i].left = views[k]; break;
								case "right": 
									views[i].right = views[k]; break;
								case "up":
									views[i].up = views[k]; break;
								case "down": 
									views[i].down = views[k]; break;
								case "enter":
									views[i].enter = views[k]; break;
								case "back": 
									views[i].back = views[k]; break;
							}
							break;
						}
					}
				}
			}
		}
	});
	return views;
} 

// it tests the application by tests from json file.
async function runTests(filenName){
	var testCases = await readTestCases(filenName);
	console.log(testCases);
	for(var i=0; i<testCases.length; i++){
		var move = testCases[i].start;
		while(move.nextMove != null){
			click(null, move.direction);
			await waitForDOMModification()
			if(error != null){
				if(move.error == null){
					move.setError(error);
					testCases[i].fail();
				}
				error = null;
			}
			move = move.nextMove;
		}
		while(move.lastMove !=null){
			move = move.lastMove;
			var direction = move.direction;
			switch(direction){
				case "left": 
					direction = "right"; break;
				case "right": 
					direction = "left"; break;
				case "up":
					direction = "down"; break;
				case "down": 
					direction = "up"; break;
				case "enter":
					direction = "back"; break;
				case "back": 
					direction = "enter"; break;
			}
			click(null, direction);
			await waitForDOMModification()
		}
	}
	for(var i=0; i<testCases.length; i++){
		if(testCases[i].isOk){
			console.log("Test_"+ i +" OK");
		}else{
			console.log("Test_"+ i +" FAIL");
			move = testCases[i].start;
			while(move.nextMove != null){
				if(move.error != null){
					console.log("betwen " + move.name + move.id +" and " + move.nextMove.name + move.nextMove.id+" error was found:");
					console.log(move.error);
					console.log();
				}
				move = move.nextMove;
			}
		}
	}
}

// creates csv file with crowed model
function saveCSV(graph, count){
	tizen.filesystem.resolve(
			'removable_sda1',
			  function(obj) {
					var folder_obj;
					folder_obj = obj;
					if(folder_obj){
						var date = new Date();
						var file_obj = folder_obj.createFile('graph_'+count+'_'+date.getMilliseconds()+'.csv');
						if(file_obj != null){
							file_obj.openStream(
								    'a',
								    function(fs){
								    	createCSV(fs, graph);
								    },
								    function(error) {
								      console.log(JSON.stringify(error));
								    }
								  );
						}
					}
			  },
			  function(error) {
			    console.log(JSON.stringify(error));
			  },
			  'rw');
}

// from array of views creates csv. representation of oxygen
function createCSV(fileStream, graph){
	//edges
	var line = "Nodes/Edges;enter;";
	graph.forEach(function(element) {
		for(var i=0; i<6; i++){
			switch(i){
				case 0: 
					if(element.left != null && element.left != "stop"){
						line += element.name+"_left;";
					}
					break;
				case 1: 
					if(element.right != null && element.right != "stop"){
						line += element.name+"_right;";
					}
					break;
				case 2:
					if(element.up != null && element.up != "stop"){
						line += element.name+"_up;";
					}
					break;
				case 3: 
					if(element.down != null && element.down != "stop"){
						line += element.name+"_down;";
					}
					break;
				case 4:
					if(element.enter != null && element.enter != "stop"){
						line += element.name+"_enter;";
					}
					break;
				case 5:
					if(element.back != null && element.back != "stop"){
						line += element.name+"_back;";
					}
					break;
			}
		}
		if(line.length > 1000){
			console.log("write line");
			fileStream.write(line);
			line = "";
		}
	});
	line = line.slice(0, -1);
	line += "\n";
	fileStream.write(line);
	line = "";
	
	//nodes
	line += "START;"+views[0].name;
	line += "\n";
	graph.forEach(function(element) {
		line += element.name + ";-;";
		graph.forEach(function(e) {
			if(e.name != element.name){
				for(var i=0; i<6; i++){
					switch(i){
						case 0: 
							if(e.left != null && e.left != "stop"){
								line += "-;";
							}
							break;
						case 1: 
							if(e.right != null && e.right != "stop"){
								line += "-;";
							}
							break;
						case 2:
							if(e.up != null && e.up != "stop"){
								line += "-;";
							}
							break;
						case 3: 
							if(e.down != null && e.down != "stop"){
								line += "-;";
							}
							break;
						case 4:
							if(e.enter != null && e.enter != "stop"){
								line += "-;";
							}
							break;
						case 5:
							if(e.back != null && e.back != "stop"){
								line += "-;";
							}
							break;
					}
				}
			}
			else{
				for(var i=0; i<6; i++){
					switch(i){
						case 0: 
							if(element.left != null && element.left != "stop"){
								line += element.left.name+";";
							}
							break;
						case 1: 
							if(element.right != null && element.right != "stop"){
								line += element.right.name+";";
							}
							break;
						case 2:
							if(element.up != null && element.up != "stop"){
								line += element.up.name+";";
							}
							break;
						case 3: 
							if(element.down != null && element.down != "stop"){
								line += element.down.name+";";
							}
							break;
						case 4:
							if(element.enter != null && element.enter != "stop"){
								line += element.enter.name+";";
							}
							break;
						case 5:
							if(element.back != null && element.back != "stop"){
								line += element.back.name+";";
							}
							break;
					}
				}
			}
			if(line.length > 1000){
				console.log("write line");
				fileStream.write(line);
				line = "";
			}
		});
		line = line.slice(0, -1);
		line += "\n";
		fileStream.write(line);
		line = "";
	});		
	fileStream.close();
	console.log("finish saving");
}
// finds path from the specific node to the first node
function findPathToStart(start){
	var path = [start]
	var importantNodes = [start]
	for(var j=0; j<path.length; j++) {
		var node = path[j];
		if (importantNodes.some(e => e.name === node.name)) {
			if(node.back != null){
				importantNodes.push(node.back);
				path.push(node.back);
			}
		}
		for(var i=0; i<4; i++){
			var newNode;
			switch(i){
				case 0: newNode = node.down;
						break;
				case 1: newNode = node.up;
						break;
				case 2: newNode = node.left;
						break;
				case 3: newNode = node.right;
						break;
			}
			if(newNode != null){
				if (!path.some(e => e.name === newNode.name)) {
					if(newNode.enter != null){
						var name = newNode.enter.name.split("_");
						name = name[0];
						if(name == "end"){
							newNode.used = true;
							path.push(newNode);
						}
						else{
							var copy = newNode.copy();
							copy.enter = null;
							path.push(copy);
						}
					}
					else{
						path.push(newNode);
					}
				}
			}
		}
	}
	return path;
}

// it creates and save model of application
async function createModel(){
	var date = new Date();
	console.log(date.toString());
	view = new View(getActiveElement());
	views.push(view);
	await breadthSearch(view, null, loggerFocusClass);
	date = new Date();
	console.log(date.toString());
	console.log(view);
	console.log("finished");
	saveCSV(views, 0)
}

// function for serching new views
async function breadthSearch(view, parentView, focusClass){
	//searching around one element
	for(var i=0; i<4; i++){
		var element = view.value;
		var move;
		switch(i){
			case 0: move = "down";
					if(view.down != null){
						continue;
					}
					break;
			case 1: move = "up";
					if(view.up != null){
						continue;
					}
					break;
			case 2: move = "left";
					if(view.left != null){
						continue;
					}
					break;
			case 3: move = "right";
					if(view.right != null){
						continue;
					}
					break;
		}		
		click(element, move);
		await waitForDOMModification()		
		element = getActiveElement(focusClass);
		if(element === view.value){
			continue;
		}
		if(element != null){
			if(!element.isEqualNode(document.body)){
				var newView = findView(element);
				if(newView == null){
					newView = new View(element);
					newView.back = view.back;
					views.push(newView);
				}
				
				switch(i){
					case 0:	
							if(view.down == null){
								view.down = newView;
								newView.up = view;
							}
							break;
					case 1: 
							if(view.up == null){
								view.up = newView;
								newView.down = view;
							}
							break;
					case 2: 
							if(view.left == null){
								view.left = newView;
								newView.right = view;
							}
							break;
					case 3: 
							if(view.right == null){
								view.right = newView;
								newView.left = view;
							}		
				}
			}
		}
		switch(i){
			case 0: move = "up";break;
			case 1: move = "down";break;
			case 2: move = "right";break;
			case 3: move = "left";break;
		}
		click(element, move);
		await waitForDOMModification()
	}
	parentViews.push(view);
	// changes important element to another element
	for(var i=0; i<5; i++){
		switch(i){
		case 0: 
				if(view.down != null && view.down != "stop" && view.down != parentView && !parentViews.includes(view.down)){
					click(element, "down");
					await waitForDOMModification();
					await breadthSearch(view.down, view, focusClass);
				}
				break;
		case 1:
				if(view.up != null && view.up != "stop" && view.up != parentView && !parentViews.includes(view.up)){
					click(element, "up");
					await waitForDOMModification();
					await breadthSearch(view.up, view, focusClass);
				}
				break;
		case 2:
				if(view.left != null && view.left != "stop" && view.left != parentView && !parentViews.includes(view.left)){
					click(element, "left");
					await waitForDOMModification();
					await breadthSearch(view.left, view, focusClass);
				}
				break;
		case 3:
				if(view.right != null && view.right != "stop" && view.right != parentView && !parentViews.includes(view.right)){
					click(element, "right");
					await waitForDOMModification();
					await breadthSearch(view.right, view, focusClass);
				}
				break;
				
		case 4:
				if(view.enter == null && view.enter != "stop"){
					click(element, "enter");
					await waitForDOMModification()
					element = getActiveElement(focusClass);
					if(element == null){		
						newView = new View(element);
						views.push(newView);
						view.enter = newView;
						click(document.body, "back");
						await waitForDOMModification()	
					}
					else{
						if(element !== view.value){
							if(!element.isEqualNode(document.body)){
								var newView = findView(element);
								if(newView == null){
									newView = new View(element);
									views.push(newView);
									view.enter = newView;
									newView.back = view;
									await breadthSearch(view.enter, view, focusClass);
								}
								if(newView == view.back){
									click(document.body, "enter");
									await waitForDOMModification()
									click(document.body, "right");
									await waitForDOMModification()
									click(document.body, "right");
									await waitForDOMModification()
								}
							}
						}
					}
				}
				break;
		}
	
	}
	if(parentView != null){
		if(parentView === view.down){
			click(element, "down");
			await waitForDOMModification()
		}
		else if(parentView === view.up){
			click(element, "up");
			await waitForDOMModification()
		}
		else if(parentView === view.left){
			click(element, "left");
			await waitForDOMModification()
		}
		else if(parentView === view.right){
			click(element, "right");
			await waitForDOMModification()
		}
		else{
			click(element, "back");
			await waitForDOMModification()
		}
	}
}

// simulates click by remote controller
function click(element, key){
	var code;
	switch(key){
		case "up": code = tizen.tvinputdevice.getKey('ArrowUp').code; break;//tizen.tvinputdevice.getKey('KEY_UP').code; break;
		case "down": code = tizen.tvinputdevice.getKey('ArrowDown').code; break;//tizen.tvinputdevice.getKey('KEY_DOWN').code; break;
		case "left": code = tizen.tvinputdevice.getKey('ArrowLeft').code; break;//tizen.tvinputdevice.getKey('KEY_LEFT').code; break;
		case "right": code = tizen.tvinputdevice.getKey('ArrowRight').code; break;//tizen.tvinputdevice.getKey('KEY_RIGHT').code; break;
		case "back": code = 10009; break;
		case "enter": code = tizen.tvinputdevice.getKey('Enter').code; break;//tizen.tvinputdevice.getKey('KEY_ENTER').code; break;
	}
	var e = createEvent(code);	
	document.activeElement.dispatchEvent(e);
}

function createEvent(code){
	var e = new Event('keydown', {
		bubbles: true,
		cancelable: true,
		returnValue: true
		});
	e.keyCode = code;
	return e;
}

// finds the element which is active now, uses information from user by loggerFocusClass array
function getActiveElement(){
	for(var i=0; i<loggerFocusClass.length; i++){
		var activeElements = document.getElementsByClassName(loggerFocusClass[i]);
		for(var j=0; j<activeElements.length; j++){
			var element = activeElements[j];
			var attr = element.parentElement.attributes;
			if(element.offsetHeight !== 0 && element.style.visibility !== 'hidden'){
				if(attr['aria-hidden'] == null){
					return element;
				}
				else{
					if(attr['aria-hidden'].value == "false"){
						return element;
					}
				}
			}
		}
	}
	if(document.body != document.activeElement){
		return document.activeElement;
	}
	return null;
}

// gets view from already founds views
function findView(element){
	for(i=0; i<views.length; i++){
		if(views[i].value === element){
			return views[i];
		}
	}
	return null;
}

// loop which waits until all changes inside DOM are done
function waitForDOMModification(){
	return new Promise((resolve,reject) => {  	
    	var count = 0;
    	function waitForFoo(){
    		if (activeRequest.length != 0){
    			window.setTimeout(waitForFoo,1000);
    		}
    		else{
    			console.log("modifiedCout = " + modifiedCout);
    			if (modifiedCout > 0) {
    				modifiedCout--;
	    			window.setTimeout(waitForFoo,10);
	            }
	            else{
	            	modifiedCout = 0;
	            	resolve()
	            }
    		}
    		
    	}
        window.setTimeout(waitForFoo,200);
    });
}

//it stops crawling if graph is too big
function createStopSign(steps){
	return new Promise((resolve) => {  
		views.forEach(function(element) {
			  for(var i=0; i<5; i++){
				  let direction = "";
				  switch(i){
					case 0: 
						direction = "up";
							break;
					case 1:
						direction = "down";
							break;
					case 2:
						direction = "left";
							break;
					case 3:
						direction = "right";
							break;
							
					case 4:
						direction = "enter";
							break;
				  }
				  let view = element;
				  for(var j=0; j<steps; j++){
					  view = view.getElementByDirection(direction);
					  if(view == null){
						  break;
					  }
					  if(j == steps-1){
						  switch(i){
							case 0: 
								view.up = "stop";
									break;
							case 1:
								view.down = "stop";
									break;
							case 2:
								view.left = "stop";
									break;
							case 3:
								view.right = "stop";
									break;
									
							case 4:
								view.enter = "stop";
									break;
						  }
					  }
				  }
			  }
				  
		});
		resolve();
	});
}

// changes of the XMLHttpRequest to detect if all data are downloaded from the server
var open = window.XMLHttpRequest.prototype.open 
var send = window.XMLHttpRequest.prototype.send
var activeRequest = []

function openReplacement(method, url, async, user, password) {  
	this._url = url;
	return open.apply(this, arguments);
}

function sendReplacement(data) {  
	if(this.onreadystatechange) {
	  this._onreadystatechange = this.onreadystatechange;
	}
	activeRequest.push(this);
	this.onreadystatechange = onReadyStateChangeReplacement;
	return send.apply(this, arguments);
}

function onReadyStateChangeReplacement() { 
	if(this.readyState === XMLHttpRequest.DONE) {
		var index = activeRequest.indexOf(this);
		if (index > -1) {
			activeRequest.splice(index, 1);
		}
	  }
	if(this._onreadystatechange) {
	  return this._onreadystatechange.apply(this, arguments);
	}
}

window.XMLHttpRequest.prototype.open = openReplacement;  
window.XMLHttpRequest.prototype.send = sendReplacement;


// detect of errors inside application
window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
    console.log("error was found");
    error = errorMsg;
    return false;
}

// writes to the console all storages connected to the television
function storage(){
	tizen.filesystem.listStorages(function(result) {
		  console.log(JSON.stringify(result));
		}, function() {
		  console.log(JSON.stringify(error));
		});
}


