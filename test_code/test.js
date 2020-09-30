function myFunction(){
	a();
	function anotherFunction(){}
}

function a(){
	console.log("This is a");
}

function b(){}
myFunction();