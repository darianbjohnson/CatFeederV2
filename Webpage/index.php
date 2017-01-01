<html>
	<head>
		<title>Alexa Powered Cat Feeder</title>
		<script type="text/javascript">

			function hide (elements) {
			  elements = elements.length ? elements : [elements];
			  for (var index = 0; index < elements.length; index++) {
				elements[index].style.display = 'none';
			  }
			}
			
			function show (elements, specifiedDisplay) {
			  elements = elements.length ? elements : [elements];
			  for (var index = 0; index < elements.length; index++) {
				elements[index].style.display = specifiedDisplay || 'block';
			  }
			}

			function handleDiv(){
				//alert(isEmpty(getParameterByName('serial')));
				
				if (isEmpty(getParameterByName('code')) == false){//we need to show the token code
					hide(document.getElementById('getSerial'));
					hide(document.getElementById('getCode'));
					show(document.getElementById('getToken'));
					//alert("A");
					return;
				}
				
				if (isEmpty(getParameterByName('serial')) == false){//we need to show the login process - to get the code
					hide(document.getElementById('getSerial'));
					show(document.getElementById('getCode'));
					hide(document.getElementById('getToken'));
					//alert("B");
					return;
				}	

				if (isEmpty(getParameterByName('serial')) == true){//we need to start the process and get the serial (topic id)
					show(document.getElementById('getSerial'));
					hide(document.getElementById('getCode'));
					hide(document.getElementById('getToken'));
					//alert("C");
					return
					
				}
				

				
			}

			function getParameterByName(name, url) {
				if (!url) {
				  url = window.location.href;
				}
				name = name.replace(/[\[\]]/g, "\\$&");
				var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
					results = regex.exec(url);
				if (!results) return null;
				if (!results[2]) return '';
				return decodeURIComponent(results[2].replace(/\+/g, " "));
			}
			
			function isEmpty(val){
				return (val === undefined || val == null || val.length <= 0) ? true : false;
			}

		</script>
	</head>
<body onload='handleDiv()'>
<img src='catfeeder_clear_sm.jpg'>
<h2>The Cat Feeder skill allows you to automaically replenish your cat food supply when you are running low. To do this you will need to use Amazon's Dash Repleishment Service.</h2>
<li>Download the required certificates and keys <a href="https://s3.amazonaws.com/catfeeder/CatFeederAuth.zip">here</a></li>
<li>Find instructions on building your Cat Feeder <a href="https://www.hackster.io/darian-johnson/automated-cat-feeder-with-alexa-and-amazon-dash-ae2602">here</a></li>
<br>
<hr width="75%">
<p>
<div id="amazon-root"></div>
<script type="text/javascript">


  window.onAmazonLoginReady = function() {
    amazon.Login.setClientId('<YOUR ID>');
  };
  
  
  (function(d) {
    var a = d.createElement('script'); a.type = 'text/javascript';
    a.async = true; a.id = 'amazon-login-sdk';
    a.src = 'https://api-cdn.amazon.com/sdk/login1.js';
    d.getElementById('amazon-root').appendChild(a);
  })(document);
  
</script>



<div id='getSerial' name='getSerial' style="display:none">
	<h3>Step 1: Enter the code you recieved in your Alexa App</h3>
	<p>
	<form action='https://darianbjohnson.com/catfeeder/index.php'>
		<b>Code:</b><input type="text" name='serial' id="serial" size="35"><input type="submit" value="Submit"><br>
		<i>Example code: f81d4fae-7dec-11d0-a765-00a0c91e6bf6 </i>
	</form>

</div>

<div id = 'getCode' name='getCode' style="display:none">
<h3>Step 2: Authenticate through Amazon to enable the Dash Replenishment Service</h3>
<p>
<a href="#" id="LoginWithAmazon">
  <img border="0" alt="Login with Amazon"
    src="https://images-na.ssl-images-amazon.com/images/G/01/lwa/btnLWA_gold_156x32.png"
    width="156" height="32" />
</a>

<script type="text/javascript">


  document.getElementById('LoginWithAmazon').onclick = function() {
  
  //alert(document.getElementById('serial').value);
    //var returnuri = 'https://s3.amazonaws.com/catfeeder/cat_feeder_success.html';
	var returnuri = 'https://darianbjohnson.com/catfeeder/index.php';
  	var serial = getParameterByName('serial');
    var options = new Object();
	var scope = ('dash:replenish');
	var scope_data = new Object();
	scope_data['dash:replenish'] = {"device_model":'<YOUR DEVICE MODEL>',"serial":serial,"is_test_device":true};
	options['scope_data'] = scope_data;
	options['scope'] = scope;
	options['state'] = serial;
	options['interactive'] = 'always';
	options['response_type'] = 'code';
    amazon.Login.authorize(options, returnuri);
	
	
    return false;
  };

</script>

</div>

<div id = 'getToken' name='getToken' style="display:none">

 <p>

<?php

	$grant_type = 'authorization_code';
	$client_id = '<YOUR ID>';	
	$client_secret = '<YOUR SECRET>';	
	$code =  $_GET['code'];
	$serial = $_GET['state'];
	//$encoded_auth = base64_encode($client_id . ':' . $client_secret);

	$data = array("grant_type"=>"authorization_code", "code" => $code, "client_id"=> $client_id, "client_secret"=> $client_secret);
	/*$postvars = json_encode($data); */
		
	$postvars = '';
	  foreach($data as $key=>$value) {
		$postvars .= $key . "=" . $value . "&";
	  }

	$ch = curl_init('https://api.amazon.com/auth/o2/token'); 
	curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
	curl_setopt($ch, CURLOPT_POSTFIELDS, $postvars);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($ch, CURLOPT_HTTPHEADER, array(
	//'Content-Type: application/x-www-form-urlencoded;charset=UTF-8','Authorization: Basic '. $encoded_auth));
	'Content-Type: application/x-www-form-urlencoded;charset=UTF-8'));

	$result = curl_exec($ch);
		
	curl_close($ch);
		
	$result_arr = json_decode($result,true);

	if (isset($result_arr['error']) == true){ //there was an error obtaining the auth token

		echo '<h3>There was an error authenticating with Amazon. Can you please start over again? Click <a href="index.php">here</a> to start again.</h3>'	;
		
	}else{
		
		
		$access_token = $result_arr['access_token'];
		$refresh_token = $result_arr['refresh_token'];

		$data = array("serial" => $serial , "access_token" => $access_token, "refresh_token" => $refresh_token);
		$data_string = json_encode($data);

		$ch = curl_init('<MY API GATEWAY CALL TO SAVE THE TOKEN TO AWS>');
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
		curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array(
		'Content-Type: application/json',
		'Content-Length: ' . strlen($data_string))
		);

		$result = curl_exec($ch);
		
		if ($result == '"Success"'){
			
			echo "<h3>You've successfully registered your Dash Replenishment with the Cat Feeder. </h3>";
			echo "<p>";
			
			echo "<script type='text/javascript'>";
			echo "document.getElementById('Logout').onclick = function() {";
			echo "amazon.Login.logout();";
			echo "};</script>";
			
		}else{
			echo "<h3>Error:";
			echo $result;
			echo "<p>Please try again. Click here to start <a href='index.php'>again</a>.</h3>";
		}
		

		
	}


?>

</div>


<body>
</html>