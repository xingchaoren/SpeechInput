var speech = new Speech();
speech.on('speech',function(input){
	speech.youtube({
		query:input,
		max:10,
		callback:function(result){
			console.log(result);
		}	
	});
	console.log(input);
});