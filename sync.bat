set GOOS=linux
set GOARCH=amd64

go build -o nakama

rem scp -P 31222  nakama   root@47.122.45.71:/root/nakama/bin
rem scp -P 31222  nakama   root@8.138.94.100:/root/nakama/bin
scp -P 22  nakama   root@39.101.186.196:/root/star/bin

rem scp -P 22  nakama   root@118.145.200.91:/root/nakama/bin
rem ssh root@192.168.102.223
