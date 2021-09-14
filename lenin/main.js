// heroku git:remote -a dcshoeslenin"use strict";

// SETTINGS of this demo:
const SETTINGS = {
  gltfModelURL: 'models/glTF/cap4.gltf',
  cubeMapURL: 'Bridge2/',
  offsetYZ: [0.7, -0.5], // offset of the model in 3D along vertical and depth axis
  scale: 2.3
};

let THREECAMERA = null;
let faceMesh = null;
let visible = true;
let gltfObj = null;
let threeStuffs = null;

// build the 3D. called once when Jeeliz Face Filter is OK
function init_threeScene(spec){
  threeStuffs = JeelizThreeHelper.init(spec, null);

  const loadingManager = new THREE.LoadingManager();
  // CREATE THE MASK
  const maskLoader = new THREE.BufferGeometryLoader(loadingManager);
  /*
    faceLowPolyEyesEarsFill.json has been exported from dev/faceLowPolyEyesEarsFill.blend
    using THREE.JS blender exporter with Blender v2.76
  */
  maskLoader.load('./models/face/faceLowPolyEyesEarsFill2.json', function (maskBufferGeometry) {
    const vertexShaderSource = 'uniform mat2 videoTransformMat2;\n\
    varying vec2 vUVvideo;\n\
    varying float vY, vNormalDotZ;\n\
    const float THETAHEAD = 0.25;\n\
    \n\
    void main() {\n\
      vec4 mvPosition = modelViewMatrix * vec4( position, 1.0);\n\
      vec4 projectedPosition = projectionMatrix * mvPosition;\n\
      gl_Position = projectedPosition;\n\
      \n\
      // compute UV coordinates on the video texture:\n\
      vec4 mvPosition0 = modelViewMatrix * vec4( position, 1.0 );\n\
      vec4 projectedPosition0 = projectionMatrix * mvPosition0;\n\
      vUVvideo = vec2(0.5,0.5) + videoTransformMat2 * projectedPosition0.xy/projectedPosition0.w;\n\
      vY = position.y*cos(THETAHEAD)-position.z*sin(THETAHEAD);\n\
      vec3 normalView = vec3(modelViewMatrix * vec4(normal,0.));\n\
      vNormalDotZ = pow(abs(normalView.z), 1.5);\n\
    }';

    const fragmentShaderSource = "precision lowp float;\n\
    uniform sampler2D samplerVideo;\n\
    varying vec2 vUVvideo;\n\
    varying float vY, vNormalDotZ;\n\
    void main() {\n\
      vec3 videoColor = texture2D(samplerVideo, vUVvideo).rgb;\n\
      float darkenCoeff = smoothstep(-0.15, 0.05, vY);\n\
      float borderCoeff = smoothstep(0.0, 0.55, vNormalDotZ);\n\
      gl_FragColor = vec4(videoColor, borderCoeff );\n\
    }";

    const mat = new THREE.ShaderMaterial({
      vertexShader: vertexShaderSource,
      fragmentShader: fragmentShaderSource,
      transparent: true,
      flatShading: false,
      depthTest: true,
      uniforms: {
        samplerVideo:{ value: JeelizThreeHelper.get_threeVideoTexture() },
        videoTransformMat2: {value: spec.videoTransformMat2}
      },
      transparent: true
    });
    maskBufferGeometry.computeVertexNormals();
    faceMesh = new THREE.Mesh(maskBufferGeometry, mat);
    faceMesh.renderOrder = -10000;
    faceMesh.frustumCulled = false;
    faceMesh.scale.multiplyScalar(1,3,3);
    faceMesh.position.set(0, 0.3, -0.25);
  })


  // IMPORT THE GLTF MODEL:
  // from https://threejs.org/examples/#webgl_loader_gltf
  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load( SETTINGS.gltfModelURL, function ( gltf ) {

    // center and scale the object:
    const bbox = new THREE.Box3().expandByObject(gltf.scene);

    // center the model:
    const centerBBox = bbox.getCenter(new THREE.Vector3());
    gltf.scene.position.add(centerBBox.multiplyScalar(-1));
    gltf.scene.position.add(new THREE.Vector3(0.2,SETTINGS.offsetYZ[0], SETTINGS.offsetYZ[1]));

    // scale the model according to its width:
    const sizeX = bbox.getSize(new THREE.Vector3()).x;
    gltf.scene.scale.multiplyScalar(SETTINGS.scale / sizeX);

    const light = new THREE.AmbientLight( 0xCCCCCC ); // soft white light


    // dispatch the model:
    faceMesh.position.add(new THREE.Vector3(0,0,-0.1));
    threeStuffs.faceObject.add(faceMesh);

    gltfObj = gltf.scene;

    threeStuffs.faceObject.add(gltfObj);
    gltfObj.visible = false;
    threeStuffs.faceObject.add(light);
  } ); //end gltfLoader.load callback
  //CREATE THE CAMERA
  THREECAMERA = JeelizThreeHelper.create_camera();
} //end init_threeScene()

//entry point, launched by body.onload():
function main(){
  JeelizResizer.size_canvas({
    canvasId: 'jeeFaceFilterCanvas',
    isFullScreen: true,
    callback: start,
    onResize: function(){
      JeelizThreeHelper.update_camera(THREECAMERA);
    }
  })
}
let k =0;
let faceIdLenin = null;
function saveAs(uri, filename) {

  var link = document.createElement('a');

  if (typeof link.download === 'string') {

      link.href = uri;
      link.download = filename;

      //Firefox requires the link to be in the body
      document.body.appendChild(link);

      //simulate click
      link.click();

      //remove the link when done
      document.body.removeChild(link);

  } else {

      window.open(uri);

  }
}

let KEY = "6ee7673d325e4e029176113fedb6d69f";

const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, {type: contentType});
  return blob;
}


let faceIds = [];
function start(){

  JEELIZFACEFILTER.init({
    videoSettings:{ // increase the default video resolution since we are in full screen
      'idealWidth': 1280,  // ideal video width in pixels
      'idealHeight': 800,  // ideal video height in pixels
      'maxWidth': 1920,    // max video width in pixels
      'maxHeight': 1920,
      'facingMode': 'environment'    // max video height in pixels
    },
    followZRot: true,
    canvasId: 'jeeFaceFilterCanvas',
    NNCPath: '../../../neuralNets/', //root of NN_DEFAULT.json file
    callbackReady: function(errCode, spec){
      if (errCode){
        console.log('AN ERROR HAPPENS. SORRY BRO :( . ERR =', errCode);
        return;
      }

      console.log('INFO: JEELIZFACEFILTER IS READY');
      init_threeScene(spec);
      // let kepka = threeStuffs.getObjectById('1');
      // console.log(kepka);
    }, //end callbackReady()

    // called at each render iteration (drawing loop):
    callbackTrack: function(detectState){
      JeelizThreeHelper.render(detectState, THREECAMERA);
      if(detectState.detected>0.7){
        if(k==0){
          html2canvas(document.querySelector("#jeeFaceFilterCanvas"),{scale:0.2}).then(canvas => {
            // document.body.appendChild(canvas)
            // console.log(canvas.toDataURL());
            const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
              const byteCharacters = atob(b64Data);
              const byteArrays = [];

              for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                const slice = byteCharacters.slice(offset, offset + sliceSize);

                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                  byteNumbers[i] = slice.charCodeAt(i);
                }

                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
              }

              const blob = new Blob(byteArrays, {type: contentType});
              return blob;
            }

            const contentType = 'image/png';
            const screendata = canvas.toDataURL().slice(22);
            // const screendata = 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
            const blob = b64toBlob(screendata, contentType);
            const blobUrl = URL.createObjectURL(blob);

            // const img = document.createElement('img');
            // img.src = blobUrl;
            // // document.body.appendChild(img);
            // saveAs(canvas.toDataURL(), 'file-name.png');

            axios({
              method: 'post',
              url: 'https://leninfr.cognitiveservices.azure.com/face/v1.0/detect',
              headers: {'Ocp-Apim-Subscription-Key': KEY,
              'Content-Type': 'application/octet-stream'},
              params : {
                'detectionModel': 'detection_03',
                'returnFaceId': 'true',
                'returnFaceLandmarks' : 'false',
                'returnfaceRectangle' : 'false'
              },
              data: blob
            }).then(function (response) {


              console.log(response.data[0]['faceId']);
              faceIdLenin = response.data[0]['faceId'];

              if(faceIds.indexOf(faceIdLenin)==-1){
                faceIds.push(faceIdLenin);

              let lenin_group_id = "9b0cae9d-16e4-4ef7-b76c-f60682e13dd6";

              axios({
                method: 'post',
                url: 'https://leninfr.cognitiveservices.azure.com/face/v1.0/identify',
                headers: {'Ocp-Apim-Subscription-Key': KEY},
                data:{'PersonGroupId': lenin_group_id,
                    'faceIds': [faceIdLenin],
                    'maxNumOfCandidatesReturned': 1,
                    'confidenceThreshold': 0.5
                }
              }).then(function (response) {
                console.log(response);
                if (response.data[0]["candidates"].length ==0){
                    console.log("Lenin Not Detected");
              }
                else{
                  console.log(response.data[0]['candidates'][0]["confidence"]);
                  let conf = response.data[0]['candidates'][0]["confidence"];
                  if(conf>0.5){
                    gltfObj.visible = true;
                    document.getElementById('plane3').style.display = 'none';
                    document.getElementById('enddiv').style.display='flex';
                  }
                };
              })
              .catch(function (error) {
                console.log(error.response.data);
              });
              }


            })
            .catch(function (error) {
              console.log(error.response.data);
            });
          });
          k+=1;
        }
      }
      if(detectState.detected<0.5){
        k=0;
        gltfObj.visible = false;
      }
    }
  }); //end JEELIZFACEFILTER.init call
} //end start()

