///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
    'dojo/_base/declare',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidgetSetting',
    'jimu/dijit/SimpleTable',
    'jimu/LayerInfos/LayerInfos',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/query',
    'dijit/registry',
    'dojo/_base/array',
    "./EditFields",
    "./EditDescription",
    "../utils",
    'dijit/Editor',
        'dojo/dom-style'
],
  function (
    declare,
    _WidgetsInTemplateMixin,
    BaseWidgetSetting,
    Table,
    LayerInfos,
    lang,
    on,
    query,
    registry,
    array,
    EditFields,
    EditDescription,
    editUtils,
    Editor,
    domStyle

    ) {
    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
      //these two properties is defined in the BaseWidget
      baseClass: 'jimu-widget-smartEditor-setting',
      _jimuLayerInfos: null,
      _layersTable: null,
      _editableLayerInfos: null,
      _editFields: null,
      startup: function () {
        this.inherited(arguments);
        this.nls = lang.mixin(this.nls, window.jimuNls.common);
        LayerInfos.getInstance(this.map, this.map.itemInfo)
          .then(lang.hitch(this, function (operLayerInfos) {
            this._jimuLayerInfos = operLayerInfos;
            this._init();
            this.setConfig();
            this._initEditor();
          }));
       
      },

      destroy: function () {
        this._jimuLayerInfos = null;
        delete this._jimuLayerInfos;
        this._layersTable = null;
        delete this._layersTable;
        this._editableLayerInfos = null;
        delete this._editableLayerInfos;
        this._editFields = null;
        delete this._editFields;
        this._editDescriptions = null;
        delete this._editDescriptions;
        this.inherited(arguments);
      },

      _init: function () {
        this._initSettings();
        this._initLayersTable();
      },

      _initLayersTable: function () {
        var fields = [{
          name: 'edit',
          title: this.nls.layersPage.layerSettingsTable.edit,
          type: 'checkbox',
          'class': 'editable'
        }, {
          name: 'label',
          title: this.nls.layersPage.layerSettingsTable.label,
          type: 'text',
          'class': 'layer'
        }, {
          name: 'allowUpdateOnly',
          title: this.nls.layersPage.layerSettingsTable.allowUpdateOnly,
          type: 'checkbox',
          'class': 'update'
        }, {
          name: 'allowDelete',
          title: this.nls.layersPage.layerSettingsTable.allowDelete,
          type: 'checkbox',
          'class': 'update'
        },
        {
          name: 'disableGeometryUpdate',
          title: this.nls.layersPage.layerSettingsTable.update,
          type: 'checkbox',
          'class': 'disable'
        },
        {
          name: 'allowUpdateOnlyHidden',
          type: 'checkbox',
          hidden: true
        },
        {
          name: 'allowDeleteHidden',
          type: 'checkbox',
          hidden: true
        },
        {
          name: 'disableGeometryUpdateHidden',
          type: 'checkbox',
          hidden: true
        },
        {
          name: 'actions',
          title: this.nls.layersPage.layerSettingsTable.fields,
          type: 'actions',
          'class': 'actions',
          actions: ['edit']
        }];
        var args = {
          fields: fields,
          selectable: false
        };
        this._layersTable = new Table(args);
        this._layersTable.placeAt(this.tableLayerInfos);
        this._layersTable.startup();

        var nl = query("th.simple-table-field", this._layersTable.domNode);
        nl.forEach(function (node) {
          switch (node.innerText) {
            case this.nls.layersPage.layerSettingsTable.edit:
              node.title = this.nls.layersPage.layerSettingsTable.editTip;
              break;
            case this.nls.layersPage.layerSettingsTable.label:
              node.title = this.nls.layersPage.layerSettingsTable.labelTip;
              break;
            case this.nls.layersPage.layerSettingsTable.allowUpdateOnly:
              node.title = this.nls.layersPage.layerSettingsTable.allowUpdateOnlyTip;
              break;
            case this.nls.layersPage.layerSettingsTable.allowDelete:
              node.title = this.nls.layersPage.layerSettingsTable.allowDeleteTip;
              break;
            case this.nls.layersPage.layerSettingsTable.update:
              node.title = this.nls.layersPage.layerSettingsTable.updateTip;
              break;
            case this.nls.layersPage.layerSettingsTable.fields:
              node.title = this.nls.layersPage.layerSettingsTable.fieldsTip;
              break;

          }

        }, this);

        this.own(on(this._layersTable,
          'actions-edit',
          lang.hitch(this, this._onEditFieldInfoClick)));
        this.own(on(this._layersTable,
          'row-dblclick',
          lang.hitch(this, this._onRowDoubleClick)));

      },

      _initSettings: function () {
        //this.showDeleteButton.set('checked', this.config.editor.showDeleteButton);
        this.displayPromptOnSave.set('checked', this.config.editor.displayPromptOnSave);
        this.displayPromptOnDelete.set('checked', this.config.editor.displayPromptOnDelete);
        this.removeOnSave.set('checked', this.config.editor.removeOnSave);
        //this.clearSelectionOnClose.set('checked', false);
      },

      setConfig: function () {
        // if (!config.editor.layerInfos) { //***************
        //   config.editor.layerInfos = [];
        // }
        this._editableLayerInfos = this._getEditableLayerInfos();
        this._setLayersTable(this._editableLayerInfos);
       
      },

      _getEditableLayerInfos: function () {
        // summary:
        //   get all editable layers from map.
        // description:
        //   layerInfo will honor configuration if that layer has configured.
        var editableLayerInfos = [];
        for (var i = this.map.graphicsLayerIds.length - 1; i >= 0; i--) {
          var layerObject = this.map.getLayer(this.map.graphicsLayerIds[i]);
          if (layerObject.type === "Feature Layer" &&
              layerObject.url &&
              layerObject.isEditable &&
              layerObject.isEditable()) {
            var layerInfo = this._getLayerInfoFromConfiguration(layerObject);
            if (!layerInfo) {
              layerInfo = this._getDefaultLayerInfo(layerObject);
            }
            editableLayerInfos.push(layerInfo);
          }
        }
        return editableLayerInfos;
      },

      _getLayerInfoFromConfiguration: function (layerObject) {
        var layerInfo = null;
        var layerInfos = this.config.editor.layerInfos;
        if (layerInfos && layerInfos.length > 0) {
          for (var i = 0; i < layerInfos.length; i++) {
            if (layerInfos[i].featureLayer &&
               layerInfos[i].featureLayer.id === layerObject.id) {
              layerInfo = layerInfos[i];
              break;
            }
          }

          if (layerInfo) {
            // update fieldInfos.
            layerInfo.fieldInfos = this._getSimpleFieldInfos(layerObject, layerInfo);
            // set _editFlag to true
            layerInfo._editFlag = true;

            layerInfo.mapLayer = [];

            layerInfo.mapLayer.resourceInfo =
              this._jimuLayerInfos.getLayerInfoById(layerObject.id).originOperLayer.resourceInfo;
            layerInfo.mapLayer.url =
              this._jimuLayerInfos.getLayerInfoById(layerObject.id).originOperLayer.url;

          }
        }
        return layerInfo;
      },

      _getDefaultLayerInfo: function (layerObject) {
        var allowsCreate = false;
        var allowsUpdate = false;
        var allowsDelete = false;
        var allowGeometryUpdates = false;
        if (layerObject.hasOwnProperty('capabilities')) {
          if (String(layerObject.capabilities).indexOf('Update') !== -1) {
            allowsUpdate = true;
          }
          if (String(layerObject.capabilities).indexOf('Delete') !== -1) {
            allowsDelete = true;
          }
          if (String(layerObject.capabilities).indexOf('Create') !== -1) {
            allowsCreate = true;
          }
        }
        if (layerObject.hasOwnProperty('allowGeometryUpdates')) {
          allowGeometryUpdates = layerObject.allowGeometryUpdates;
        }
        var editable = true;
        if (this.config.editor.layerInfos &&
            this.config.editor.layerInfos.length > 0) {
          editable = array.some(this.config.editor.layerInfos, function (layerInfo) {
            return (layerInfo.featureLayer.id === layerObject.id);
          });
        }
        var origLayerInfo = this._jimuLayerInfos.getLayerInfoById(layerObject.id);
        var layerInfo = {
          'featureLayer': {
            'id': layerObject.id,
            'layerAllowsCreate': allowsCreate,
            'layerAllowsUpdate': allowsUpdate,
            'layerAllowsDelete': allowsDelete,
            'layerAllowGeometryUpdates': allowGeometryUpdates
          },
          'mapLayer': {
            'resourceInfo': origLayerInfo.originOperLayer.resourceInfo,
            'url': origLayerInfo.originOperLayer.url
          },
          'disableGeometryUpdate': !allowGeometryUpdates,
          'allowUpdateOnly': !allowsCreate,
          'allowDelete': false,
          'fieldInfos': this._getSimpleFieldInfos(layerObject),
          '_editFlag': editable
        };
        return layerInfo;
      },

      _setLayersTable: function (layerInfos) {
        var nl = null;
        array.forEach(layerInfos, function (layerInfo) {
          var _jimuLayerInfo = this._jimuLayerInfos.getLayerInfoById(layerInfo.featureLayer.id);
          var addRowResult = this._layersTable.addRow({
            label: _jimuLayerInfo.title,
            edit: layerInfo._editFlag,
            allowUpdateOnly: layerInfo.allowUpdateOnly,
            allowUpdateOnlyHidden: layerInfo.allowUpdateOnly === null ?
              false : layerInfo.allowUpdateOnly,
            allowDelete: layerInfo.allowDelete,
            allowDeleteHidden: layerInfo.allowDelete === null ?
              false : layerInfo.allowDelete,
            disableGeometryUpdate: layerInfo.disableGeometryUpdate,
            disableGeometryUpdateHidden: layerInfo.disableGeometryUpdate === null ?
              false : layerInfo.disableGeometryUpdate
          });
          addRowResult.tr._layerInfo = layerInfo;

          if (layerInfo.featureLayer.layerAllowsDelete === false) {
            nl = query(".allowDelete", addRowResult.tr);
            nl.forEach(function (node) {

              var widget = registry.getEnclosingWidget(node.childNodes[0]);

              widget.setStatus(false);
            });
          }
          if (layerInfo.featureLayer.layerAllowsCreate === false) {
            nl = query(".allowUpdateOnly", addRowResult.tr);
            nl.forEach(function (node) {

              var widget = registry.getEnclosingWidget(node.childNodes[0]);

              widget.setStatus(false);
            });
          }
          if (layerInfo.featureLayer.layerAllowsUpdate === false) {
            nl = query(".allowUpdateOnly", addRowResult.tr);
            nl.forEach(function (node) {

              var widget = registry.getEnclosingWidget(node.childNodes[0]);

              widget.setStatus(false);
            });
          }
          if (layerInfo.featureLayer.layerAllowGeometryUpdates === false) {
            nl = query(".disableGeometryUpdate", addRowResult.tr);
            nl.forEach(function (node) {

              var widget = registry.getEnclosingWidget(node.childNodes[0]);

              widget.setStatus(false);
            });
          }
        }, this);
      },

      // about fieldInfos mehtods.
      _getDefaultSimpleFieldInfos: function (layerObject) {
        var fieldInfos = [];
        for (var i = 0; i < layerObject.fields.length; i++) {
          if (layerObject.fields[i].editable) {
            fieldInfos.push({
              fieldName: layerObject.fields[i].name,
              label: layerObject.fields[i].alias || layerObject.fields[i].name,
              isEditable: true
            });
          }
        }
        return fieldInfos;
      },

      _getWebmapSimpleFieldInfos: function (layerObject) {
        var webmapSimpleFieldInfos = [];
        var webmapFieldInfos =
          editUtils.getFieldInfosFromWebmap(layerObject.id, this._jimuLayerInfos);
        if (webmapFieldInfos) {
          array.forEach(webmapFieldInfos, function (webmapFieldInfo) {
            if (webmapFieldInfo.isEditableOnLayer) {
              webmapSimpleFieldInfos.push({
                fieldName: webmapFieldInfo.fieldName,
                label: webmapFieldInfo.label,
                isEditable: webmapFieldInfo.isEditable
              });
            }
          });
          if (webmapSimpleFieldInfos.length === 0) {
            webmapSimpleFieldInfos = null;
          }
        } else {
          webmapSimpleFieldInfos = null;
        }
        return webmapSimpleFieldInfos;
      },

      _getSimpleFieldInfos: function (layerObject, layerInfo) {
        var baseSimpleFieldInfos;
        var simpleFieldInfos = [];
        var defautlSimpleFieldInfos = this._getDefaultSimpleFieldInfos(layerObject);
        var webmapSimpleFieldInfos = this._getWebmapSimpleFieldInfos(layerObject);

        baseSimpleFieldInfos =
          webmapSimpleFieldInfos ? webmapSimpleFieldInfos : defautlSimpleFieldInfos;

        if (layerInfo && layerInfo.fieldInfos) {
          // Edit widget had been configured
          // keep order of config fieldInfos and add new fieldInfos at end.
          array.forEach(layerInfo.fieldInfos, function (configuredFieldInfo) {
            for (var i = 0; i < baseSimpleFieldInfos.length; i++) {
              if (configuredFieldInfo.fieldName === baseSimpleFieldInfos[i].fieldName) {
                simpleFieldInfos.push(configuredFieldInfo);
                baseSimpleFieldInfos[i]._exit = true;
                break;
              }
            }
          });
          array.forEach(baseSimpleFieldInfos, function (baseSimpleFieldInfo) {
            if (!baseSimpleFieldInfo._exit) {
              simpleFieldInfos.push(baseSimpleFieldInfo);
            }
          });
        } else {
          simpleFieldInfos = baseSimpleFieldInfos;
        }
        return simpleFieldInfos;
      },
      _onRowDoubleClick: function (tr) {
        var rowData = this._layersTable.getRowData(tr);
        if (rowData && rowData.edit) {
          this._editDescriptions = new EditDescription({
            nls: this.nls,
            _layerInfo: tr._layerInfo,
            _layerName: rowData.label
          });
          this._editDescriptions.popupEditDescription();
        }
      },
      _onEditFieldInfoClick: function (tr) {
        var rowData = this._layersTable.getRowData(tr);
        if (rowData && rowData.edit) {
          this._editFields = new EditFields({
            nls: this.nls,
            _layerInfo: tr._layerInfo,
            _layerName: rowData.label
          });
          this._editFields.popupEditPage();
        }
      },

      _getText: function () {
        var editorText, regExp;
        editorText = this._editorObj.focusNode.innerHTML;
        //editorText = editorText.replace(/&nbsp;/g, '');
        //regExp = new RegExp("<div><br></div>", 'g');
        //editorText = editorText.replace(regExp, "");
        //regExp = new RegExp("<p><br></p>", 'g');
        //editorText = editorText.replace(regExp, "");
        //regExp = new RegExp("<p></p>", 'g');
        //editorText = editorText.replace(regExp, "");
        //editorText = editorText.replace(/<br>/g, "");
        //editorText = lang.trim(editorText);

        return editorText;
      },
      _initEditor: function () {
        if (!this._editorObj) {
          this._editorObj = new Editor({
            plugins: [
              "bold", "italic", "underline", "|", "cut", "copy",
              "paste", "|", "foreColor"
            ],
            height: "95%"
          }, this.editorDescription);
          domStyle.set(this._editorObj.domNode, {
            "width": '100%',
            "height": '100%'
          });
          this.own(on(this._editorObj, "focus", lang.hitch(this,
            function () {

            })));
          this.own(on(this._editorObj, "blur", lang.hitch(this,
            function () {

            })));

          this._editorObj.onLoadDeferred.then(lang.hitch(this, function () {

          }));
          if (this.config.editor.editDescription === undefined || this.config.editor.editDescription === null) {
            this._editorObj.set("value", this.nls.layersPage.title);
          }
          else {
            this._editorObj.set("value", this.config.editor.editDescription);
          }
          this._editorObj.startup();
        }
      },


      _resetSettingsConfig: function () {
        
        this.config.editor.displayPromptOnSave =
          this.displayPromptOnSave.checked === undefined ?
          false : this.displayPromptOnSave.checked;
        this.config.editor.displayPromptOnDelete =
          this.displayPromptOnDelete.checked === undefined ?
          false : this.displayPromptOnDelete.checked;
        this.config.editor.removeOnSave =
          this.removeOnSave.checked === undefined ?
          false : this.removeOnSave.checked;
      
      },

      getConfig: function () {

        this._resetSettingsConfig();
        this.config.editor.editDescription = this._getText();
        // get layerInfos config
        var checkedLayerInfos = [];
        var layersTableData = this._layersTable.getData();
        array.forEach(this._editableLayerInfos, function (layerInfo, index) {
          layerInfo._editFlag = layersTableData[index].edit;
          layerInfo.allowUpdateOnly = (layersTableData[index].allowUpdateOnly === null ?
            layersTableData[index].allowUpdateOnlyHidden : layersTableData[index].allowUpdateOnly);
          layerInfo.allowDelete = (layersTableData[index].allowDelete === null ?
            layersTableData[index].allowDeleteHidden : layersTableData[index].allowDelete);
          layerInfo.disableGeometryUpdate = (layersTableData[index].disableGeometryUpdate === null ?
            layersTableData[index].disableGeometryUpdateHidden :
            layersTableData[index].disableGeometryUpdate);
          if (layerInfo._editFlag) {
            delete layerInfo._editFlag;
            delete layerInfo.mapLayer;
            checkedLayerInfos.push(layerInfo);
          }
         

        });

        if (checkedLayerInfos.length === 0) {
          return false;
        } else {
          this.config.editor.layerInfos = checkedLayerInfos;
        }

        return this.config;
      }
    });
  });