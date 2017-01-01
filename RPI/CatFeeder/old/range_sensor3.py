import RPi.GPIO as GPIO
import time
GPIO.setmode(GPIO.BCM)

SIG = 18
TRIG = 24 #23 
ECHO = 23 #24

print "Distance Measurement In Progress"

#GPIO.setup(TRIG,GPIO.OUT)
#GPIO.setup(ECHO,GPIO.IN)
GPIO.setup(SIG, GPIO.OUT)

GPIO.output(SIG, False)
print "Waiting For Sensor To Settle"
time.sleep(2)

GPIO.output(SIG, True)
time.sleep(0.00001)
#time.sleep(0.025)
GPIO.output(SIG, False)

while GPIO.input(SIG)==0:
  pulse_start = time.time()

while GPIO.input(SIG)==1:
  pulse_end = time.time()

pulse_duration = pulse_end - pulse_start

distance = pulse_duration * 17150

distance = round(distance, 2)

print "Distance:",distance,"cm"

GPIO.cleanup()
