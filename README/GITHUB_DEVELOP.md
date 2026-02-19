# collaborator如何进行github开发

1. 克隆仓库：

```bash
git clone https://github.com/baiweichihu/26b-website.git
```

2. 创建分支：
   分支名称需要与目前的工作保持一致，比如后端的UserService模块开发，可以创建`backend/userservice`分支

```bash
git checkout -b <branch-name>
```

将`<branch-name>`替换为你的分支名称

3. 进行代码开发和修改

开发前，要先检查你的分支是否有没有commit的代码：

```bash
git checkout <branch-name>
git status
```

如果有，你可以先暂存起来：

```bash
git stash
```

之后pull最新的代码：

```bash
git checkout main
git pull origin main
```

之后切换到你的分支，进行合并：

```bash
git checkout <branch-name>
git merge main
```

将`<branch-name>`替换为你的分支名称。

这个时候，如果你有暂存的代码，可以通过下面的命令恢复：

```bash
git stash pop
```

如果有冲突你需要解决它，github不接受任何有merge conflict head的代码。

4. 提交代码
   首先通过确认你的分支不在main分支上：

```bash
git branch
```

如果显示：

```
* <branch-name>
  main
```

将`<branch-name>`替换为你的分支名称，说明你在正确的分支上。

开发完成后，先`git add`你想要提交的文件修改，之后进行代码的提交：

```bash
git commit -m "你的提交信息"
```

如果你想要提交所有修改过的文件，可以使用`-a`参数：

```bash
git commit -a -m "你的提交信息"
```

最后，将代码推送到远程仓库。首次推送时，可能需要指定上游分支：

```bash
git push -u origin <branch-name>
```

如果不是首次推送，可以直接使用：

```bash
git push origin <branch-name>
```

5. 创建pull request（PR）
   在GitHub仓库页面，切换到你的分支，点击“Compare & pull request”按钮，填写相关信息后提交pull request。在右上角，你可以申请reviewer对你的代码进行审核。所有的pr尽量都要交给lf审核一遍，不要直接合并到main分支。如果你的代码动了其他模块，需要相关模块的负责人也进行review。

6. 清除本地分支
   当你的pull request被合并，**并且与你的branch名字相关的功能已经完成**，你可以删除本地的分支：

```bash
git checkout main
git pull origin main
git branch -d <branch-name>
```

如果你的功能尚未完成，不要删除本地分支，可以继续在这个分支上进行开发。并且，-d只能删除已经合并的本地分支。

<h3 align="center">尽量写一点PR一点，写什么都可以PR，不要写完整个模块再PR，这将对lf以及其他可能的reviewer造成不可恢复的打击，并且可能的bug也不容易被查出来 (doge</h3>
