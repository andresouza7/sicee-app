curl -H "Content-Type: application/json" -X POST -d '[{"device_id":"1","power":"86.4","voltage":"120","current":"0.72"},{"device_id":"2","power":"50","voltage":"120","current":"0.6"},{"device_id":"3","power":"500","voltage":"120","current":"2.3"},{"device_id":"4","power":"20","voltage":"120","current":"0.12"}]' http://localhost:3000/api/telemetry

curl -H "Content-Type: application/json" -X POST -d '[{"device_id":"11223","power":"86.4","voltage":"120","current":"0.72"}]' http://localhost:3000/api/telemetry

curl -H "Content-Type: application/json" -X POST -d 'Aviso de queda de tensão :)' http://localhost:8080/api/smsAlert