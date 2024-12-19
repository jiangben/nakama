set GOOS=linux
set GOARCH=amd64

go build -o nakama

#scp -P 31222  nakama   root@47.122.45.71:/root/nakama/bin
#scp -P 31222  nakama   root@8.138.94.100:/root/nakama/bin
#scp -P 22  nakama   root@8.138.113.90:/root/star/bin

scp -P 22  nakama   root@8.138.113.90:/root/star/bin
#ssh root@192.168.102.223
