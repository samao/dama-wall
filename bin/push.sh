#!/bin/bash
#定义时间
echo "=== 提交备份到github ==="
git add --all
git commit -a --message "$1"
git push origin master
now=`date`
echo '推送github 完成.'$now