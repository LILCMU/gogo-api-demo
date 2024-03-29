# GoGo API Demo
This project shows essential communication between GoGo Board and PC

The communication can be shows in following diagram

> **GoGoBoard** `<-- USB HID -->` **GoGo Plugin** `<-- websocket -->` **Web Application**

### When reading data packets from the GoGo

> **GoGo Board** `-- USB HID -->` **GoGo Plugin** `-- WS -->` **Web Application**

Note that data packets are automaticaly streamed upon power up. No need to make a request for them. 

### When controling the GoGo (e.g. turning on a motor)
> **Web Application** `-->` **GoGo Plugin** `-->` **GoGo Board**

### When compiling Logo Code and downloading the compiled binary code to the board.

The process is divided into two steps.
1. Compile Logo Code. This is done by sending the text code to the compiler hosted on AWS. A compiled binary code is returned.
2. Send the compiled binary code to the GoGo Board via the plugin 

## Offline datalog feature
A chart to showing datalog records from the GoGo
- Usage and Development Notes can be found here: [Offline Datalog Notes](OfflineDatalogNote.md)

## Live Demo
Hosted with gh-page: [gogo-api-demo (feature/webhid)](https://lilcmu.github.io/gogo-api-demo)

## Reference Docs
- [GoGo protocol docs](https://docs.google.com/spreadsheets/d/1CAfjpUdyYPqjVIPBuzxWlWMIDCX9ud6ybqAj8qMgy4E/edit?usp=sharing)

## Project setup
### NodeJs version 14 is recommended
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```
