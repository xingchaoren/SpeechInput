var speech = new Speech();
//speech.key("maps","AIzaSyCXB0Ud73F6_nmzB2HA7Y4UTD2IWZ-E-jI");
speech.on('speech',function(input){
	speech.twitter({
		query:input,
		max:10,
		callback:function(result){
			console.log(result);
		}	
	});
	console.log(input);
});