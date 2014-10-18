
#s::
MouseGetPos, xpos, ypos 
FileAppend, %xpos% %ypos%`n, ..\map_temp_cities.txt
return