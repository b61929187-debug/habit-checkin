# 小步 · 习惯打卡

一个纯静态的习惯打卡网页。习惯和每日完成状态保存在当前浏览器的
`localStorage` 中，不需要后端服务。

## 在电脑上预览

在当前目录打开 PowerShell，运行：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 发布到 GitHub Pages

1. 登录 GitHub，打开 <https://github.com/new?name=habit-checkin&visibility=public>。
2. 确认仓库名称为 `habit-checkin`，可见性为 `Public`，点击
   `Create repository`。
3. 在空仓库页面点击 `uploading an existing file`。
4. 上传以下四个文件：
   - `index.html`
   - `styles.css`
   - `app.js`
   - `favicon.svg`
5. 点击 `Commit changes`。
6. 打开仓库的 `Settings` → `Pages`。
7. 在 `Build and deployment` 中选择 `Deploy from a branch`。
8. 分支选择 `main`，目录选择 `/ (root)`，点击 `Save`。
9. 等待 1 至 3 分钟，然后访问：

```text
https://<你的GitHub用户名>.github.io/habit-checkin/
```

例如 GitHub 用户名是 `xiaobu`，网址就是：

```text
https://xiaobu.github.io/habit-checkin/
```

手机打开网址后，可以通过浏览器的“添加到主屏幕”把它作为快捷应用使用。

## 更新网站

修改本地文件后，在 GitHub 仓库中重新上传对应文件并提交。GitHub Pages
会自动更新公开网址。

## 数据说明

- 每个手机或电脑浏览器分别保存自己的习惯和打卡记录。
- 清除浏览器网站数据会同时清除本地记录。
- 网页代码发布到公开仓库不会公开任何个人打卡数据。
