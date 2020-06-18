// It is required to set the float precision for fragment shaders in OpenGL ES
// More info here: https://stackoverflow.com/a/28540641/4908989
#ifdef GL_ES
precision mediump float;
#endif

// Main function
void main () {

  gl_FragColor = vec4(0.58, 0.80, 0.77, 1.);
}