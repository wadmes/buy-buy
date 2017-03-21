var app = require('./index');
var multer = require('multer');
var model = require('./model');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var upload = multer({dest: '../tmp'});

function check_login(req, res){
	if(!req.session.user){
		res.redirect('/');
		return false;
	}
	return true
}

function rm_tmp_pic(req){
	var files = req.files;
	for(var i=0; i<files.length; i++){
		fs.unlink(files[i].path, function(err){
			if(err)console.log(err);
		});
	}
}

function mv_tmp_pic(item, item_path, i, files, req, res){// leave dirty file
	if(i>=files.length)return;

	var len = item.pictures.length;
	if(len == 0)item.pictures.set(len, 0);
	else item.pictures.set(len, item.pictures[len-1]+1);

	fs.rename(files[i].path, path.join(item_path, item.pictures[len]+'.jpg'), function(err){
		if(err){
			rm_tmp_pic(req);
			return res.send({feedback: 'Failure', err_msg: 'Fail to save pictures'});
		}

		if(i == files.length-1)item.save(function(err){
			if(err){
				rm_tmp_pic(req);
				return res.send({feedback: 'Failure', err_msg: 'Fail to save pictures'})
			}
			return res.send({feedback: 'Success'});
		});
		else mv_tmp_pic(item, item_path, i+1, files, req, res);
	});
}

var upload_pic = upload.array('pic', app.get('item_pic_size'));
app.post('/items/:iid/upload', function(req, res){// pictures to jpg
	upload_pic(req, res, function(err){

		if(err){
			rm_tmp_pic(req);
			return res.send({feedback: 'Failure', err_msg: 'Exceed upload max count'});
		}
		if(!check_login(req, res))return rm_tmp_pic(req);

		var valid_ext = ['jpg', 'jpeg', 'png'];
		var files = req.files;
		for(var i=0; i<files.length; i++){
			var strs = files[i].originalname.split('.');
			if(valid_ext.indexOf(strs[strs.length -1].toLowerCase()) < 0){
				rm_tmp_pic(req);
				return res.send({feedback: 'Failure', err_msg: 'Invalid extension'});
			}
		}

		var iid = req.params.iid;
		model.Item.get(iid, function(result){
			if(result.feedback != 'Success'){
				rm_tmp_pic(req);
				return res.send(result);
			}
			var user = req.session.user;
			var item = result.item;
			if(!item.uid.equals(user._id)){
				rm_tmp_pic(req);
				return res.send({feedback: 'Failure', err_msg: 'Invalid information'});
			}
			if(item.pictures.length+files.length > app.get('item_pic_size')){
				rm_tmp_pic(req);
				return res.send({feedback: 'Failure', err_msg: 'Exceed upload max count'});
			}
			var item_path = path.join(__dirname, '..', 'uploads', item._id.toString());
			mkdirp(item_path, function(err){});
			mv_tmp_pic(item, item_path, 0, files, req, res);
		})
	});
});

app.delete('/items/:iid/pictures/:p', function(req, res){
	if(!check_login(req, res))return;
	var iid = req.params.iid;
	var p = req.params.p;
	model.Item.get(iid, function(result){
		if(result.feedback != 'Success')return res.send(result);
		var item = result.item;
		var i = item.pictures.indexOf(p);
		if(i<0)return res.send({feedback: 'Failure', err_msg: 'Fail to delete picture'});
		item.pictures.splice(i, 1);
		item.save(function(err){
			if(err)return res.send({feedback: 'Failure', err_msg: 'Fail to delete picture'});
			var pic_path = path.join(__dirname, '..', 'uploads', item._id.toString(), p+'.jpg');
			fs.unlink(pic_path, function(err){
				if(err)console.log(err);
			});
			return res.send({feedback: 'Success'});
		});
	})
});
/*app.get('/secret_entrance', function(req, res){
	model.Item.get('58ce8ded4bfd7c75adad1017', function(result){
		result.item.pictures = [];
		result.item.save();
	})
	model.User.get('58ce66dd24598a74addd93ba', function(result){
		req.session.user = result.user;
		res.send('Login success!\n');
	})
});*/
