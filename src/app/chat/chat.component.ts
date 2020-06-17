import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Mensaje } from './models/mensaje';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';



@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {
  private client: Client;
  conectado: boolean;
  mensaje: Mensaje = new Mensaje();
  mensajes: Mensaje[] = [];
  escribiendo: string;
  clienteId: string;

  constructor() {
    this.conectado = false;
    this.clienteId = 'id-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2);
  }

  ngOnInit() {
    this.client = new Client();
    this.client.webSocketFactory = () => {
      return new SockJS("http://localhost:8080/chat-websocket");
    }

    this.client.onConnect = (frame) => {
      console.log("Conectados: " + this.client.connected + ' : ' + frame);
      this.conectado = true;

      this.client.subscribe('/chat/mensaje', e => {
        let mensaje: Mensaje = JSON.parse(e.body) as Mensaje;
        mensaje.fecha = new Date(mensaje.fecha)
        if(!this.mensaje.color && mensaje.tipo == 'NUEVO_USUARIO' && this.mensaje.username == mensaje.username) {
          this.mensaje.color = mensaje.color;
        }
        this.mensajes.push(mensaje);
        console.log(mensaje);
      });

      this.client.subscribe('/chat/escribiendo', e => {
        this.escribiendo = e.body;
        setTimeout(() => this.escribiendo = '', 3000);
      });

      this.client.subscribe('/chat/historial/' + this.clienteId, e => {
        const historial = JSON.parse(e.body) as Mensaje[];
        this.mensajes = historial.map(m => {
          m.fecha = new Date(m.fecha);
          return m; 
        }).reverse();
      });

      this.client.publish({
        destination: '/app/historial',
        body: this.clienteId
      });

      this.mensaje.tipo='NUEVO_USUARIO';
      this.client.publish({
        destination: '/app/mensaje',
        body: JSON.stringify(this.mensaje)}
        );
    }

    this.client.onDisconnect = (frame) => {
      console.log('Conetados: ' + this.client.connected + ' : ' + frame);
      this.conectado = false;
      this.mensaje = new Mensaje();
      this.mensajes = [];
    }
  }

  conectar(){
    this.client.activate();
  }

  desconectar(){
    this.client.deactivate();
  }

  enviarMensaje(){
    this.mensaje.tipo='MENSAJE';
    this.client.publish({
      destination: '/app/mensaje',
      body: JSON.stringify(this.mensaje)}
      );
    this.mensaje.texto = '';
  }

  escribiendoEvento() {
    this.client.publish({
      destination: '/app/escribiendo',
      body: this.mensaje.username
    });
  }
}
