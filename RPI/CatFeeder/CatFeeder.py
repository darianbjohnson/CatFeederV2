#!/usr/bin/python
# Writen by Darian Johnson


import paho.mqtt.client as paho
import os
import socket
import ssl
import uuid
import json
import time
import os
import tinys3

# Servo Control
#import time
#import wiringpi

# use 'GPIO naming'
#wiringpi.wiringPiSetupGpio()

# set #18 to be a PWM output
#wiringpi.pinMode(18, wiringpi.GPIO.PWM_OUTPUT)

# set the PWM mode to milliseconds stype
#wiringpi.pwmSetMode(wiringpi.GPIO.PWM_MODE_MS)

# divide down clock
#wiringpi.pwmSetClock(192)
#wiringpi.pwmSetRange(2000)

#delay_period = 0.01



#update with the topic (Serial) ID 
topic = 'YOUR ID'

#initialize servo & pwm commands
os.system("gpio -g mode 18 pwm")
os.system("gpio pwm-ms")
os.system("gpio pwmc 192")
os.system("gpio pwmr 2000")

def on_connect(client, userdata, flags, rc):
    print("Connection returned result: " + str(rc) )
    # Subscribing in on_connect() means that if we lose the connection and
    # reconnect then subscriptions will be renewed.
    #client.subscribe("#" , 1 )
    client.subscribe(topic + "/#",1)

def on_message(client, userdata, msg):
    print("payload: " + msg.payload)
    parsed_json = json.loads(msg.payload)
    
    #Logic to take the selfie
    if msg.topic ==topic + "/feed":
        try:
            print("got a message, so at least this is working")
            runtime = parsed_json["amount"]
            t_end = time.time() + runtime

            while time.time() < t_end:
                os_string = "gpio -g pwm 18 200"
                os.system(os_string)
	        
            print("done spinning")
            #os_string = "gpio -g pwm 18 150"
	    os_string = "gpio -g pwm 18 0"
            os.system(os_string)

            
        except:
            #payload = json.dumps({'intent':'selfie-taken','message':'error'})
            #mqttc.publish(email +'/display', payload, qos=1)
            #message = 'error'
            print('did not publish')
    elif msg.topic == topic + "/photo":
        try:
            photo_name = parsed_json["photo"]
            #delete old photos
            os.system("rm Photos/*.jpg")
            
            #take a photo using the name passed to us from mqtt message
            photo  = "Photos/" + photo_name + ".jpg"
            os_string = "fswebcam --no-banner " + photo
            os.system(os_string)
            
            #use tinyS3 to upload the photo to AWS S3
            #Note this key only allows write access to the mysticmirror bucket; contact Darian Johnson for the key for this access
            S3_SECRET_KEY = '<UPDATE WITH THE SECRET KEY>' 
            S3_ACCESS_KEY = '<UPDATE WITH THE ACCESS KEY>' 
            
            conn = tinys3.Connection(S3_ACCESS_KEY,S3_SECRET_KEY,tls=True)
            f = open(photo,'rb')
            conn.upload(photo,f,'catfeeder')
            
        except:
            #payload = json.dumps({'intent':'selfie-taken','message':'error'})
            #mqttc.publish(email +'/display', payload, qos=1)
            #message = 'error'
            print('did not publish')
            


mqttc = paho.Client()
mqttc.on_connect = on_connect
mqttc.on_message = on_message
#mqttc.on_log = on_log

#variables to connect to AWS IoT
#Note these certs allow access to send IoT messages
awshost = "data.iot.us-east-1.amazonaws.com"
awsport = 8883
clientId = "MyCatFeeder-" + str(uuid.uuid4())
thingName = "MyCatFeeder"
caPath = "/home/pi/certs/verisign-cert.pem"
#certPath = "/home/pi/certs/766c546fa7-certificate.pem.crt"
#keyPath = "/home/pi/certs/766c546fa7-private.pem.key"
certPath = "/home/pi/certs/CatFeeder.cert.pem"
keyPath = "/home/pi/certs/CatFeeder.private.key"

mqttc.tls_set(caPath, certfile=certPath, keyfile=keyPath, cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2, ciphers=None)

mqttc.connect(awshost, awsport, keepalive=60)

mqttc.loop_forever() 


    
