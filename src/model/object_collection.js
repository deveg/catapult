// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview Provides the ObjectCollection class.
 */
base.require('range');
base.require('sorted_array_utils');
base.require('model.object_instance');
base.require('model.time_to_object_instance_map');

base.exportTo('tracing.model', function() {
  var ObjectInstance = tracing.model.ObjectInstance;

  /**
   * A collection of object instances and their snapshots, accessible by id and
   * time, or by object name.
   *
   * @constructor
   */
  function ObjectCollection(parent) {
    this.parent = parent;
    this.bounds = new base.Range();
    this.instanceMapsById = {}; // id -> TimeToObjectInstanceMap
  }

  ObjectCollection.prototype = {
    __proto__: Object.prototype,

    getOrCreateInstanceMap_: function(id) {
      var instanceMap = this.instanceMapsById[id];
      if (instanceMap)
        return instanceMap;
      instanceMap = new tracing.model.TimeToObjectInstanceMap(this.parent, id);
      this.instanceMapsById[id] = instanceMap;
      return instanceMap;
    },

    idWasCreated: function(id, category, name, ts) {
      var instanceMap = this.getOrCreateInstanceMap_(id);
      return instanceMap.idWasCreated(category, name, ts);
    },

    addSnapshot: function(id, category, name, ts, args) {
      var instanceMap = this.getOrCreateInstanceMap_(id, category, name, ts);
      var snapshot = instanceMap.addSnapshot(category, name, ts, args);
      if (snapshot.objectInstance.category != category) {
        throw new Error('Added snapshot with different category ' +
                        'than when it was created');
      }
      if (snapshot.objectInstance.name != name) {
        throw new Error('Added snapshot with different name than ' +
                        'when it was created');
      }
      return snapshot;
    },

    idWasDeleted: function(id, category, name, ts) {
      var instanceMap = this.instanceMapsById[id];
      if (!instanceMap)
        return undefined;
      var deletedInstance = instanceMap.idWasDeleted(category, name, ts);
      if (!deletedInstance)
        return;
      if (deletedInstance.category != category) {
        throw new Error('Deleting an object with a different category ' +
                        'than when it was created');
      }
      if (deletedInstance.name != name) {
        throw new Error('Deleting an object with a different name than ' +
                        'when it was created');
      }
    },

    getObjectInstanceAt: function(id, ts) {
      var instanceMap = this.instanceMapsById[id];
      if (!instanceMap)
        return undefined;
      return instanceMap.getInstanceAt(ts);
    },

    getSnapshotAt: function(id, ts) {
      var instance = this.getObjectInstanceAt(id, ts);
      if (!instance)
        return undefined;
      return instance.getSnapshotAt(ts);
    },

    getAllObjectInstances: function() {
      var instances = [];
      base.dictionaryValues(this.instanceMapsById).forEach(function(i2iMap) {
        instances.push.apply(instances, i2iMap.instances);
      });
      return instances;
    },

    updateBounds: function() {
      this.bounds.reset();
      this.getAllObjectInstances().forEach(function(instance) {
        instance.updateBounds();
        this.bounds.addRange(instance.bounds);
      }, this);
    },

    shiftTimestampsForward: function(amount) {
      this.getAllObjectInstances().forEach(function(instance) {
          instance.shiftTimestampsForward(amount);
      });
    },

    addCategoriesToDict: function(categoriesDict) {
      this.getAllObjectInstances().forEach(function(instance) {
        categoriesDict[instance.category] = true;
      });
    },

    toJSON: function() {
      // TODO(nduca): Implement this if we need it.
      return {};
    },
  };

  return {
    ObjectCollection: ObjectCollection,
  };
});
