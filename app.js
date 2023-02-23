const express=require('express');
const app=new express();
const {conexion} = require('./db');
const fs = require('fs');
const path = require('path')
const upload = require('express-fileupload');
const bodyparser = require("body-parser");
const nodemailer=require('nodemailer');
require('dotenv').config();
const chalk = require('chalk');
const jwt = require('./utils/jwt');
const {prevenirLogin ,permisosAdmin}=require('./middleware/autenticacion')
const { urlencoded } = require('express');
const { resolve4 } = require('dns');


// configuracion nodmeailer
var transporter=nodemailer.createTransport({
  service:'gmail',
  auth:{
    user:process.env.MAILUSER,
    pass:process.env.MAILPASS
  }
})
app.use(express.urlencoded({extended:false}))
app.use(express.static('public'));
app.use(upload());
app.set('view engine',"ejs");
app.set("views",__dirname+"/views");

// Inicio
app.get('/', async (req,res) => {
    var rolAdmin=req.headers.cookie || false ;

    // obtener email
  var email = await jwt.obtenerEmail(rolAdmin);

  // Consulta saldo
  var consultaSaldo='SELECT "Saldo" from "Usuarios" WHERE "Email"=$1'
  const parametros6=[email];
  var respuestaSaldo;
  try{
    respuestaSaldo = await conexion.query(consultaSaldo,parametros6);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }
  var saldo;

  if(respuestaSaldo.rows[0]==undefined){
    saldo=0;
    res.cookie(process.env.JWT_COOKIE,"",{httpOnly:true,maxAge:1});
    res.redirect("/login");
  }else{
    saldo = respuestaSaldo.rows[0].Saldo;

    // Quitar decimales a saldo
    var saldoFinal=''
    var primerPunto=false;
    for (i =0; i <= saldo.length ; i++) { 
                                  
      if(saldo[i]=='.'){
        primerPunto=true;
      }
      if(primerPunto==false){
        saldoFinal+=saldo[i];
      }
    }
    saldo=saldoFinal
  }

  if(rolAdmin == false){
    saldo=0;
  }

  // Consulta foto perfil
  var consultaFoto='SELECT "Foto_perfil" FROM "Usuarios" WHERE "Email"=$1'
  const parametros15=[email];
  var respuestaFotoPerfil;
  try{
    respuestaFotoPerfil = await conexion.query(consultaFoto,parametros15);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }
  var fotoPerfil;
  try{
    fotoPerfil=respuestaFotoPerfil.rows[0];
  }catch(err){
    console.log("Error consulta: "+err.message);
    fotoPerfil=null;
}
var fondo ='contacto/IMAGEN FONDO.png'


    res.render('index',{rolAdmin:rolAdmin, saldo:saldo, fotoPerfil:fotoPerfil, fondo:fondo})
})

// Contacto
app.get('/contacto', (req,res) => {
  var rolAdmin=req.headers.cookie || false ;

  var fondo ='contacto/IMAGEN FONDO.png'
    res.render('contacto',{rolAdmin:rolAdmin, fondo:fondo})
})

// Login
app.get("/login",prevenirLogin, async function (req,res){
  var rolAdmin=req.headers.cookie || false ;
  var nouser=true;
  var fondo ='inicio/IMAGEN INICIO FONDO.png'
   // msg si viene de restauracion contraseña
   var msg=false;
   
   //ruta
    res.render('login',{rolAdmin:rolAdmin, nouser:nouser, msg:msg , fondo:fondo})
  })

app.post("/login", async function (req,res){
  var consultaAdmin='SELECT "Email","Password" from "Usuarios" WHERE "Email"=$1 AND "Password"=$2'
  const parametros=[req.body.email,req.body.password];
  var respuestaAdmin;

  try{
    respuestaAdmin = await conexion.query(consultaAdmin,parametros);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }
    const email = req.body.email;
    const usuario = {
      email:email
    }


    if(respuestaAdmin.rows[0]==undefined){
      var rolAdmin=req.headers.cookie || false ;
      var nouser=false;
      var fondo ='inicio/IMAGEN INICIO FONDO.png';

      res.render('login',{rolAdmin:rolAdmin, nouser:nouser, fondo:fondo})
      
    }else{
      const token = await jwt.generarToken(usuario);
      res.cookie(process.env.JWT_COOKIE,token,{httpOnly:true});
      res.redirect('/');

    }
})

//Register
app.get('/register',prevenirLogin, (req,res) => {
  var user=req.headers.cookie || false ;
  var existe=false;
  var codigoExiste=true;
  var fondo= 'inicio/IMAGEN INICIO FONDO.png'
  res.render('register',{user:user, existe,codigoExiste:codigoExiste, fondo:fondo})
})

app.post("/register", async function (req,res){
  // Consulta si el email esta registrado
  var consultaUser='SELECT "Email" from "Usuarios" WHERE "Email"=$1'
  const parametros=[req.body.email];
  var respuestaUser;
  var existe=false;
  try{
    respuestaUser = await conexion.query(consultaUser,parametros);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }


  try{
    if(respuestaUser.rows[0].Email==req.body.email){
      existe= true;
      var user=req.headers.cookie || false ;
      var codigoExiste=true;
      var fondo ='inicio/IMAGEN INICIO FONDO.png'

      res.render('register',{user:user, existe:existe, codigoExiste:codigoExiste, fondo:fondo})
    }
  }catch(err){
    console.log("Error consulta: "+err.message);
    
  }  

  // Codigo valido
  var consultaCodigo='SELECT "codigo" FROM "codigo" WHERE "codigo"=$1;'
  var parametros7 = [req.body.codigo];
  var codigoExiste= false;
  var respuestaCodigo;

  try{
    respuestaCodigo = await conexion.query(consultaCodigo,parametros7);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }

  try{
    if(respuestaCodigo.rows[0].codigo==req.body.codigo){
      codigoExiste= true;

      // Borrar codigo
      var borrarCodigo='DELETE FROM "codigo" WHERE "codigo"=$1;'
      const parametros8=[req.body.codigo];
      var respuestaBorrar;
      try{
        respuestaBorrar = await conexion.query(borrarCodigo,parametros8);
      } catch(err){
          console.log("Error consulta: "+err.message);
      }

    }
  }catch(err){
    console.log("Error consulta: "+err.message);
    codigoExiste=false;
    var fondo ='inicio/IMAGEN INICIO FONDO.png'

    res.render('register',{user:user, existe:existe, codigoExiste:codigoExiste, fondo:fondo})

    
  }  

  // Agrega Usuario
    var registrar='INSERT INTO "Usuarios"("Nombre", "Email", "Password", "Tipo") VALUES ($1, $2, $3, 2);';
    const parametros2=[req.body.name,req.body.email,req.body.password[0]];
    var respuestaRegistro;
    try{
      respuestaRegistro = await conexion.query(registrar,parametros2);
    } catch(err){
        console.log("Error consulta: "+err.message);
        var user=req.headers.cookie || false ;
        var existe=false;
        var fondo ='inicio/IMAGEN INICIO FONDO.png'

        res.render('register',{user:user, existe, fondo:fondo})
    }

    // Añadir codigo a usuario
    var agregarCodigo='UPDATE "Usuarios" SET "Codigo"=$1 WHERE "Email"=$2;'
    const parametros9=[req.body.codigo,req.body.email];
    var resultadoAgregar;
    try{
      resultadoAgregar = await conexion.query(agregarCodigo,parametros9);
    } catch(err){
        console.log("Error consulta: "+err.message);
    }

    var rolAdmin=req.headers.cookie || false ;
    var nouser=true;
    var fondo ='inicio/IMAGEN INICIO FONDO.png'
  // msg si viene de restauracion contraseña
    var msg=false;

    res.render('login',{rolAdmin:rolAdmin, nouser:nouser, msg:msg, fondo:fondo})
  })

  // Restaurar contraseña
  app.get('/resetpassword', async (req,res) => {
    var rolAdmin=req.headers.cookie || false ;
    var mensaje = false;
    var fondo= 'inicio/IMAGEN INICIO FONDO.png'
    res.render('restorePass',{rolAdmin:rolAdmin, mensaje:mensaje, fondo:fondo})
})


app.post('/resetpassword', async (req,res) => {
  var rolAdmin=req.headers.cookie || false ;

  // Genera codigo de restauracion
  var codigo='';

  while(codigo.length<=5){
    codigo+= Math.floor((Math.random() * 10))

  }
  codigo = parseInt(codigo);

  // Almacenar en la db codigo
  var ingresarCodigo='UPDATE "Usuarios" SET "Restore"=$1 WHERE "Email"=$2;';
    const parametros3=[codigo,req.body.email];
    var respuestaCodigo;
    try{
      respuestaCodigo = await conexion.query(ingresarCodigo,parametros3);
    } catch(err){
        console.log("Error consulta: "+err.message);
      
    }

  // Envia correo al user
  let mensajeCorreo = "Restaurar contraseña\n";
  mensajeCorreo+="codigo:"+codigo+"\n";
  let mail={
    from: req.body.email,
    to: req.body.email,
    subject:'Restaurar contraseña',
    text:mensajeCorreo
  }
  transporter.sendMail(mail,function(err,info){
    if(err){
      console.log("Error en correo: "+err.message);
      res.status(500).send("Error al enviar correo");
    }else{
      console.log("Correo restaurar contraseña enviado: "+ info.response);
    }
  })

  var rolAdmin=req.headers.cookie || false ;
  var correo=req.body.email
  var mensaje=false;
  var fondo ='inicio/IMAGEN INICIO FONDO.png'

  res.render('restoreCode',{rolAdmin:rolAdmin, correo:correo, mensaje:mensaje, fondo:fondo})
})


// Restaurar contraseña
app.get('/restoreCode', async (req,res) => {
  var rolAdmin=req.headers.cookie || false ;
  var mensaje=false;
  var fondo = 'inicio/IMAGEN INICIO FONDO.png'
  res.render('restoreCode',{rolAdmin:rolAdmin, mensaje:mensaje, fondo:fondo})
})

app.post('/restoreCode', async (req,res) => {
  var rolAdmin=req.headers.cookie || false ;

  var consultaPass='SELECT "Email","Restore" from "Usuarios" WHERE "Email"=$1 AND "Restore"=$2'

  const parametrosPass=[req.body.email,req.body.codigo];
  var respuestaPass;

  try{
    respuestaPass = await conexion.query(consultaPass,parametrosPass);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }

  if(respuestaPass.rows[0]==undefined){
    var rolAdmin=req.headers.cookie || false ;
    var mensaje=true;
    var fondo ='inicio/IMAGEN INICIO FONDO.png'

    res.render('restoreCode',{rolAdmin:rolAdmin, mensaje:mensaje, fondo:fondo})
    
  }else{
    
    var correo=req.body.email;
    var fondo ='inicio/IMAGEN INICIO FONDO.png'

    res.render('passwordNew',{rolAdmin:rolAdmin, correo:correo, fondo:fondo})

  }
})

app.post('/passwordNew', async (req,res) => {

  var actualizarPass='UPDATE "Usuarios" SET "Password"=$1 WHERE "Email"=$2;';
    const parametros5=[req.body.password,req.body.email];
    var respuestaActualizacion;
    try{
      respuestaActualizacion = await conexion.query(actualizarPass,parametros5);

    } catch(err){
        console.log("Error consulta: "+err.message);
      
    }
    var rolAdmin=req.headers.cookie || false ;
    var nouser=true;
    var msg=true;
    var fondo ='inicio/IMAGEN INICIO FONDO.png'

    res.render('login',{rolAdmin:rolAdmin, nouser:nouser, msg:msg, fondo:fondo})

})

// Nuevo pedido
app.get('/ordenes',permisosAdmin, async (req,res) => {
  var rolAdmin=req.headers.cookie || false ;

  // obtener email
  var email = await jwt.obtenerEmail(rolAdmin);

  // Consulta saldo
  var consultaSaldo='SELECT "Saldo" from "Usuarios" WHERE "Email"=$1'
  const parametros6=[email];
  var respuestaSaldo;
  try{
    respuestaSaldo = await conexion.query(consultaSaldo,parametros6);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }

  // Obtener servicios
  var consultaServicios = 'SELECT * FROM "Servicios";'
  var respuestaServicios;
  try{
    respuestaServicios = await conexion.query(consultaServicios);

  }catch(err){
    console.log("Error consulta: "+err.message);
  }
  var servicios = respuestaServicios.rows;
  var categorias=['Tiktok','Facebook','Youtube','Instagram','Spotify','Twitter','Cuentas digitales','Monetización','Verificación'];

  
  try{
  var saldo= respuestaSaldo.rows[0].Saldo
  
    // Quitar decimales a saldo
    var saldoFinal=''
    var primerPunto=false;
    for (i =0; i <= saldo.length ; i++) { 
                                  
      if(saldo[i]=='.'){
        primerPunto=true;
      }
      if(primerPunto==false){
        saldoFinal+=saldo[i];
      }
    }
    saldo=saldoFinal

     // Consulta foto perfil
  var consultaFoto='SELECT "Foto_perfil" FROM "Usuarios" WHERE "Email"=$1'
  const parametros15=[email];
  var respuestaFotoPerfil;
  try{
    respuestaFotoPerfil = await conexion.query(consultaFoto,parametros15);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }
  var fotoPerfil;
  try{
    fotoPerfil=respuestaFotoPerfil.rows[0];
  }catch(err){
    console.log("Error consulta: "+err.message);
    fotoPerfil=null;
  }
  


  }catch(err){
    console.log("Error Saldo: "+err.message);
    res.cookie(process.env.JWT_COOKIE,"",{httpOnly:true,maxAge:1});
    res.redirect("/login");

  }

  var fondo= 'ordenes/fondo.jpg'
  res.render('ordenes',{rolAdmin:rolAdmin, saldo:saldo, servicios:servicios, categorias:categorias, fotoPerfil:fotoPerfil, fondo:fondo})
})

// Procesar pedido
app.post('/ordenes',permisosAdmin, async (req,res) =>{

  
  var rolAdmin=req.headers.cookie || false ;

  // obtener email
  var email = await jwt.obtenerEmail(rolAdmin);

  // Consulta saldo
  var consultaSaldo='SELECT "Saldo" from "Usuarios" WHERE "Email"=$1'
  const parametros6=[email];
  var respuestaSaldo;
  try{
    respuestaSaldo = await conexion.query(consultaSaldo,parametros6);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }

  var saldo =respuestaSaldo.rows[0].Saldo

  // Calcular precio
  var precio = "";
  var idServicio="";
  var primerEspacio=false;

  for (i =0; i <= (req.body.servicio.length -1); i++) { 
                                  
      if(req.body.servicio[i]==' '){
        primerEspacio=true;
      }
      if(primerEspacio==true){
        precio+=req.body.servicio[i]
      }
      if(primerEspacio==false){
        idServicio+=req.body.servicio[i]
      }
  }
  var precioTotal= precio*req.body.cantidad;

  // obtener fecha y hora
  var fechaHora=  new Date().toTimeString();
  var hora=fechaHora.split('T')[0].substring(0,8)

  var agno= new Date().getFullYear();
  var mes= new Date().getMonth();
  var dia= new Date().getDate()
  var fecha= agno+'-'+mes+'-'+dia


  if(precioTotal<= saldo){
    // Descontar saldo
    var saldoRestante= saldo-precioTotal;
    var consultaSaldoCompra='UPDATE "Usuarios" SET "Saldo"=$1 WHERE "Email"=$2;'
    const parametros10=[saldoRestante,email];
    var respuestaInsertarSaldo;
    try{
      respuestaInsertarSaldo = await conexion.query(consultaSaldoCompra,parametros10);
    } catch(err){
        console.log("Error Descontar saldo: "+err.message);
    }

    // Guardar imagenes y dar nombre para la db
    var imagenes=req.body.img;
      var foto1 = req.files.img
      foto1.mv(`./public/pedidos/${foto1.name}`,err => {
        if(err) return res.status(500).send({ message : err })

        
    })
    if(req.body.img2){
      imagenes+=' '+req.body.img2;
    }
    if(req.body.img3){
      imagenes+=' '+req.body.img3;
    }

    // Consulta id de pedido
    var consultaIdMax= 'SELECT id FROM "Pedidos" ORDER BY id DESC LIMIT 1';
    var resultadoId;
    try{
      resultadoId = await conexion.query(consultaIdMax);
    } catch(err){
        console.log("Error Descontar saldo: "+err.message);
    }
    var idMaximo=resultadoId.rows[0].id;
    idMaximo= parseInt(idMaximo) || 0;
    idMaximo=(idMaximo+1);

    // Agregar pedido
    var agregarPedido='INSERT INTO "Pedidos"(id, link, cantidad, estado, fecha, precio, idservicio, emailuser, hora, imagenes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);'
    const parametros11=[idMaximo,req.body.link,req.body.cantidad,'Procesando',fecha,precioTotal,idServicio,email,hora,imagenes];
    var respuestaInsertarPedido;
    var ordenExitosa=false;
    try{
      respuestaInsertarPedido = await conexion.query(agregarPedido,parametros11);
      ordenExitosa=true;
      if(ordenExitosa==true){
        var consultaPedido='SELECT * FROM "Pedidos" WHERE "id"=$1;'
        const parametros12=[idMaximo];
        var respuestaPedido;
        try{
          respuestaPedido = await conexion.query(consultaPedido,parametros12);
        } catch(err){
            console.log("Error Consultar pedido: "+err.message);
        }

        var consultaServicio='SELECT * FROM "Servicios" WHERE "id"=$1;'
        const parametros13=[idServicio];
        var respuestaServicio;
        try{
          respuestaServicio = await conexion.query(consultaServicio,parametros13);
        } catch(err){
            console.log("Error Consultar Servicio: "+err.message);
        }

        // Buscar foto de perfil
        var consultaFoto='SELECT "Foto_perfil" FROM "Usuarios" WHERE "Email"=$1'
        const parametros16=[email];
        var respuestaFotoPerfil;

        try{
          respuestaFotoPerfil = await conexion.query(consultaFoto,parametros16);
        } catch(err){
            console.log("Error consulta: "+err.message);
        }
        var fotoPerfil;
        try{
          fotoPerfil=respuestaFotoPerfil.rows[0];
        }catch(err){
          console.log("Error consulta: "+err.message);
          fotoPerfil=null;
        }


        var servicioEscogido=respuestaServicio.rows[0];
        var orden=respuestaPedido.rows[0]|| null;
        var fondo ='inicio/IMAGEN INICIO FONDO.png'

          // Quitar decimales a saldo
        var saldoFinal=''
        var primerPunto=false;
        for (i =0; i <= saldo.length ; i++) { 
                                      
          if(saldo[i]=='.'){
            primerPunto=true;
          }
          if(primerPunto==false){
            saldoFinal+=saldo[i];
          }
        }
        saldo=saldoFinal

        res.render('successful',{rolAdmin:rolAdmin, saldo:saldo, orden:orden, servicioEscogido:servicioEscogido, fotoPerfil:fotoPerfil, fondo:fondo})
      }
      
    } catch(err){
        console.log("Error Agregar pedido: "+err.message);
    }
    
  }else{

    res.render('declined',{rolAdmin:rolAdmin, saldo:saldo, fondo:fondo})

  }

})

// Mis pedidos
app.get('/mispedidos', async (req,res) => {
  var rolAdmin=req.headers.cookie || false ;
   // obtener email
   var email = await jwt.obtenerEmail(rolAdmin);

  // Consulta saldo
  var consultaSaldo='SELECT "Saldo" from "Usuarios" WHERE "Email"=$1'
  const parametros6=[email];
  var respuestaSaldo;
  try{
    respuestaSaldo = await conexion.query(consultaSaldo,parametros6);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }
  var saldo;

  if(respuestaSaldo.rows[0]==undefined){
    saldo=0;
    res.cookie(process.env.JWT_COOKIE,"",{httpOnly:true,maxAge:1});
    res.redirect("/login");
  }else{
    saldo = respuestaSaldo.rows[0].Saldo;
        // Quitar decimales a saldo
        var saldoFinal=''
        var primerPunto=false;
        for (i =0; i <= saldo.length ; i++) { 
                                      
          if(saldo[i]=='.'){
            primerPunto=true;
          }
          if(primerPunto==false){
            saldoFinal+=saldo[i];
          }
        }
        saldo=saldoFinal
  }

  if(rolAdmin == false){
    saldo=0;
  }

   // Consulta foto perfil
   var consultaFoto='SELECT "Foto_perfil" FROM "Usuarios" WHERE "Email"=$1'
   const parametros15=[email];
   var respuestaFotoPerfil;
   try{
     respuestaFotoPerfil = await conexion.query(consultaFoto,parametros15);
   } catch(err){
       console.log("Error consulta: "+err.message);
   }
   var fotoPerfil;
   try{
     fotoPerfil=respuestaFotoPerfil.rows[0];
   }catch(err){
     console.log("Error consulta: "+err.message);
     fotoPerfil=null;
  
    }
  var fondo ='mispedidos/FONDO MIS PEDIDOS.jpg'

  res.render('pedidos',{rolAdmin:rolAdmin, saldo:saldo, fotoPerfil:fotoPerfil, fondo:fondo})
})

// Actualizar foto perfil
app.post('/perfil', async (req, res) =>{
  var rolAdmin=req.headers.cookie || false ;

  // obtener email
  var email = await jwt.obtenerEmail(rolAdmin);

   // Agregar foto de perfil
   var perfil=req.files.perfil;

   var insertarFoto='UPDATE "Usuarios" SET "Foto_perfil"=$1 WHERE "Email"=$2;'
   const parametros14=[perfil.name,email];
   var respuestaFoto;
   try{
    respuestaFoto = await conexion.query(insertarFoto,parametros14);
   } catch(err){
       console.log("Error añadir foto perfil: "+err.message);
   }

   perfil.mv(`./public/perfil/${perfil.name}`,err => {
     if(err) return res.status(500).send({ message : err })     
 })

 res.redirect('/ordenes')

})

// Agregar saldo
app.get('/buy', async (req,res) => {
  var rolAdmin=req.headers.cookie || false ;

  // obtener email
var email = await jwt.obtenerEmail(rolAdmin);

// Consulta saldo
var consultaSaldo='SELECT "Saldo" from "Usuarios" WHERE "Email"=$1'
const parametros6=[email];
var respuestaSaldo;
try{
  respuestaSaldo = await conexion.query(consultaSaldo,parametros6);
} catch(err){
    console.log("Error consulta: "+err.message);
}
var saldo;

if(respuestaSaldo.rows[0]==undefined){
  saldo=0;
  res.cookie(process.env.JWT_COOKIE,"",{httpOnly:true,maxAge:1});
  res.redirect("/login");
}else{
  saldo = respuestaSaldo.rows[0].Saldo;

  // Quitar decimales a saldo
  var saldoFinal=''
  var primerPunto=false;
  for (i =0; i <= saldo.length ; i++) { 
                                
    if(saldo[i]=='.'){
      primerPunto=true;
    }
    if(primerPunto==false){
      saldoFinal+=saldo[i];
    }
  }
  saldo=saldoFinal
}

if(rolAdmin == false){
  saldo=0;
}

// Consulta foto perfil
var consultaFoto='SELECT "Foto_perfil" FROM "Usuarios" WHERE "Email"=$1'
const parametros15=[email];
var respuestaFotoPerfil;
try{
  respuestaFotoPerfil = await conexion.query(consultaFoto,parametros15);
} catch(err){
    console.log("Error consulta: "+err.message);
}
var fotoPerfil;
try{
  fotoPerfil=respuestaFotoPerfil.rows[0];
}catch(err){
  console.log("Error consulta: "+err.message);
  fotoPerfil=null;
}

var fondo ='inicio/IMAGEN INICIO FONDO.png'


  res.render('buy',{rolAdmin:rolAdmin, saldo:saldo, fotoPerfil:fotoPerfil, fondo:fondo})

})

// Ayuda
app.get('/ayuda', async (req,res) => {
  var rolAdmin=req.headers.cookie || false ;

     // obtener email
     var email = await jwt.obtenerEmail(rolAdmin);

   // Consulta saldo
   var consultaSaldo='SELECT "Saldo" from "Usuarios" WHERE "Email"=$1'
   const parametros6=[email];
   var respuestaSaldo;
   try{
     respuestaSaldo = await conexion.query(consultaSaldo,parametros6);
   } catch(err){
       console.log("Error consulta: "+err.message);
       res.cookie(process.env.JWT_COOKIE,"",{httpOnly:true,maxAge:1});
       res.redirect("/login");
   }
   var saldo;
 
   if(respuestaSaldo.rows[0]==undefined){
     saldo=0;
   }else{
     saldo = respuestaSaldo.rows[0].Saldo;
         // Quitar decimales a saldo
    var saldoFinal=''
    var primerPunto=false;
    for (i =0; i <= saldo.length ; i++) { 
                                  
      if(saldo[i]=='.'){
        primerPunto=true;
      }
      if(primerPunto==false){
        saldoFinal+=saldo[i];
      }
    }
    saldo=saldoFinal
   }
 
   if(rolAdmin == false){
     saldo=0;
   }

    // Consulta foto perfil
  var consultaFoto='SELECT "Foto_perfil" FROM "Usuarios" WHERE "Email"=$1'
  const parametros15=[email];
  var respuestaFotoPerfil;
  try{
    respuestaFotoPerfil = await conexion.query(consultaFoto,parametros15);
  } catch(err){
      console.log("Error consulta: "+err.message);
  }
  var fotoPerfil;
  try{
    fotoPerfil=respuestaFotoPerfil.rows[0];
  }catch(err){
    console.log("Error consulta: "+err.message);
    fotoPerfil=null;
}

  var fondo ='inicio/IMAGEN INICIO FONDO.png'


  res.render('ayuda',{rolAdmin:rolAdmin, saldo:saldo, fotoPerfil:fotoPerfil, fondo:fondo})
})


  // Contacto
app.post("/enviarcontacto",function(req,res){
  let mensaje = "Mensaje desde formulario de contacto\n";
  mensaje+="de :"+req.body.nombre+"\n";
  mensaje+="correo: "+req.body.correo+"\n";
  mensaje+="mensaje: "+req.body.comentario;
  let mail={
    from: req.body.correo,
    to: 'mencoalexis@gmail.com',
    subject:'mensaje formulario contacto',
    text:mensaje
  }
  transporter.sendMail(mail,function(err,info){
    if(err){
      console.log("Error en correo: "+err.message);
      res.status(500).send("Error al enviar correo");
    }else{
      console.log("Correo enviado: "+ info.response);
      res.redirect("/contacto");
    }
  })
})

// Cerrar sesión
app.post("/logout", function (req,res){
  res.cookie(process.env.JWT_COOKIE,"",{httpOnly:true,maxAge:1});
  res.redirect("/login");

})

module.exports={app}