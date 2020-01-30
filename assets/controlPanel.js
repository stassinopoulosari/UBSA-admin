var readyToLoad = () => {
  (() => {
    var $calendarHeader = document.getElementById("monthHeader"),
      $calendarContainer = document.getElementById("calendarContainer"),
      $calendarDays = [];
    var d = new Date();

    for (var i = 0; i < 6; i++) {
      var row = document.createElement("div");
      row.setAttribute("class", "row")
      for (var j = 0; j < 7; j++) {
        var col = document.createElement("div");
        col.setAttribute("class", "col panelCalendarDate");
        row.appendChild(col);
        $calendarDays.push(col);
      }
      $calendarContainer.appendChild(row);
    }

    d.setDate(1);
    var month = d.getMonth() + 1;
    var year = d.getFullYear();
    firebase.database().ref("schools/" + window.identifier + "/schedules/").on('value', (schedulesSnap) => {
      var skeds = schedulesSnap.val() || {};
      console.log(skeds);
      console.log("schools/" + window.identifier + "/calendars/" + year + "/" + (month < 10 ? "0" + month : "" + month));
      var renderCalendar = function() {
        d.setDate(1);

        month = d.getMonth() + 1;
        year = d.getFullYear();
        firebase.database().ref("schools/" + window.identifier + "/calendars/" + year + "/" + (month < 10 ? "0" + month : "" + month)).on('value', (calendarSnap) => {
          var calendar = calendarSnap.val() || "";
          console.log(calendar);
          calendar.replace(/#\([^)]*\)/g, "");
          var calendarSkeds = calendar.split(",");
          console.log(calendarSkeds);
          calendarSkeds = calendarSkeds.map((skedName) => {
            skedName = skedName.trim();
            console.log(skedName);
            if (skedName == "") return "";
            console.log(skedName);
            var skedObj = skeds[skedName];
            console.log(skedObj);
            return skedObj.name;
          });

          var firstDay = d.getDay();
          for ($calendarDay_ in $calendarDays) {
            $calendarDays[$calendarDay_].style.backgroundColor = "#89a6d5";
            $calendarDays[$calendarDay_].innerHTML = "";
          }
          for (var i = firstDay; i < firstDay + daysInMonth(d); i++) {
            var day = i - firstDay + 1;
            $calendarDays[i].innerText = day;
            console.log(calendarSkeds[day]);
            if (calendarSkeds[day]) $calendarDays[i].innerHTML += "<br>" + calendarSkeds[day];
            if ((i - firstDay) % 2 == 0) {
              $calendarDays[i].style.backgroundColor = "white";
            } else {
              $calendarDays[i].style.backgroundColor = "#EEEEEE";
            }
          }

          $calendarHeader.innerText = year + "." + (month >= 10 ? month : "0" + month);
        });
      };
      var generateCalendarPath = function(month, year, identifier) {
        return "schools/" + identifier + "/calendars/" + year + "/" + month;
      };

      window.calendarLeft = function() {
        d.setDate(0);
        renderCalendar();
      };

      window.calendarRight = function() {
        d.setDate(32);
        renderCalendar();
      };

      renderCalendar();

    });



  })();

  (() => {
    var $schoolYearForm = document.getElementById("panel-sYForm"),
      $startDate = document.getElementById('panel-schoolYearStartDate'),
      $endDate = document.getElementById('panel-schoolYearEndDate')
    var $succeededAlert = document.getElementById("panel-schoolYearSuccessPanel");
    var $failedAlert = document.getElementById("panel-schoolYearFailurePanel"),
      $failedReason = document.getElementById("panel-sYFailureReason");
    [$succeededAlert, $failedAlert].forEach((a) => {
      a.style.display = "none"
    });
    var schoolYearShown = true;
    window.toggleSchoolYear = () => {
      schoolYearShown = !schoolYearShown;
      if (schoolYearShown) {
        $schoolYearForm.style.display = "block";
      } else {
        $schoolYearForm.style.display = "none";
      }
    };
    toggleSchoolYear();
    var generateBoundsPath = function(identifier) {
      return "schools/" + identifier + "/calendars/bounds";
    };

    $schoolYearForm.onsubmit = (e) => {
      e.preventDefault();

      var startDate = $startDate.valueAsDate;
      var endDate = $endDate.valueAsDate;
      if (startDate >= endDate) {
        $failedAlert.style.display = "block";
        $failedReason.innerText = "Reason: Start date must be before end date.";
        return;
      }

      var bounds = {
        start: startDate.getTime(),
        end: endDate.getTime()
      };

      var failed = false;
      firebase.database().ref(generateBoundsPath(identifier)).set(bounds).catch((a) => {
        failed = true;
        $failedAlert.style.display = "block";
        $failedReason.innerText = "Reason: " + a;
      }).then(() => {
        if (!failed) {
          $succeededAlert.style.display = "block";
        }
      });
    };

    firebase.database().ref(generateBoundsPath(identifier)).on("value", (snapshot) => {

      if (!snapshot.val() || snapshot.val() == null) return;

      var bounds = snapshot.val();

      if (!bounds.start || !bounds.end) return;

      $startDate.valueAsDate = new Date(bounds.start);
      $endDate.valueAsDate = new Date(bounds.end);

      renderCalendarString();
    });


  })();

  (() => {
    window.dateFromStr = function(str) {
      var hrs = str.split(":")[0];
      var min = str.split(":")[1];
      var d = new Date();
      d.setHours(hrs);
      d.setMinutes(min);
      d.setSeconds(0);
      d.setMilliseconds(0);
      return d;
    }

    var $skedList = document.getElementById("panel-skedList");

    var showSchedules = true;
    window.toggleSchedules = () => {
      showSchedules = !showSchedules;
      if (showSchedules) {
        $skedList.style.display = "block";
      } else {
        $skedList.style.display = "none";
      }
    };
    toggleSchedules();

    var symbols = {};

    var renderTable = function(identifier, name, classes) {

      var $container = document.createElement("li");
      $container.setAttribute("class", "container scheduleItem list-group-item");
      $container.setAttribute("onmouseleave", "saveAllSkeds(\"" + sanitize(identifier) + "\")")
      var $nameRow = document.createElement("h5");
      $nameRow.innerText = name;
      $nameRow.innerHTML += "&nbsp;<button class='btn btn-outline-secondary' onclick='renameSchedule(\"" + sanitize(identifier) + "\")'>Rename</button>"
      $nameRow.innerHTML += "&nbsp;<button class='btn btn-outline-info' onclick='duplicateSchedule(\"" + sanitize(identifier) + "\")'>Duplicate</button>"
      $nameRow.innerHTML += "&nbsp;<button class='btn btn-outline-danger' onclick='deleteSchedule(\"" + sanitize(identifier) + "\")'>Delete</button>"

      console.log(symbols);

      $container.appendChild($nameRow);
      var $classesContainer = document.createElement("table");
      $classesContainer.setAttribute("id", "table-" + identifier);
      $classesContainer.setAttribute("class", "table");
      $classesContainer.innerHTML = "<thead><th scope='col'>Name</th><th scope='col'>Start</th><th scope='col'>End</th><th scope='col'><button type='submit' class='btn btn-primary form-control' onclick='saveAllSkeds(\"" + sanitize(identifier) + "\")'>Save</button></th><th scope='col'></th></thead>"
      var $tbody = document.createElement("tbody");
      $classesContainer.appendChild($tbody);
      $container.appendChild($classesContainer);

      var lastClass = {
        end: "08:00"
      };

      var lcLabel = "";

      var keys = [];
      for (cK in classes) {
        keys.push(cK);
      }

      var index = 0;

      for (classRow in classes) {
        if ((index > 0 && dateFromStr(classes[keys[index - 1]].end) - dateFromStr(classes[classRow].start) < -60000)) {
          $tbody.innerHTML += "<tr class='insertRow' id='" + sanitize(identifier) + "-insertRow-" + sanitize(classRow) + "'><td></td><td></td><td></td><td class='text-center'><a href='javascript:insertRowAfter(\"" + sanitize(classRow) + "\", \"" + (index == 0 ? "" : sanitize(keys[index - 1])) + "\", \"" + sanitize(identifier) + "\")'>+</a></td></tr>"
        }
        var $row = document.createElement("tr");
        $row.setAttribute("id", identifier + "-row-" + classRow);
        var cols = ["", "", "", ""];
        cols.forEach((a, index) => {
          cols[index] = document.createElement("td");
          $row.appendChild(cols[index]);
        });
        var name = classes[classRow].name;

        for (symbol in symbols) {
          name = name.split("$(" + symbol + ")").join(symbols[symbol].value + ",");
        }

        cols[0].innerHTML = "<input class='tagifyableName' id='" + sanitize(identifier) + "-" + sanitize(classRow) + "-name' type='text' value='" + sanitize(name) + "'/>";
        cols[1].innerHTML = "<input class='form-control' id='" + sanitize(identifier) + "-" + sanitize(classRow) + "-start' type='time' value='" + sanitize(classes[classRow].start) + "'/>";
        cols[2].innerHTML = "<input class='form-control' id='" + sanitize(identifier) + "-" + sanitize(classRow) + "-end' type='time' value='" + sanitize(classes[classRow].end) + "'/>";
        cols[3].innerHTML = "<button class='btn btn-outline-danger form-control' onclick='deleteSkedRow(\"" + sanitize(identifier) + "\", \"" + sanitize(classRow) + "\", \"" + sanitize(lcLabel) + "\", \"" + sanitize((keys.length <= index + 1 ? "null" : keys[index + 1])) + "\")'>Delete</button>"
        lastClass = classes[classRow];
        lcLabel = classRow;
        $tbody.appendChild($row);

        index++;
      }

      (() => {
        var $row = document.createElement("tr");
        $row.setAttribute("id", identifier + "-toAddRow");
        $row.setAttribute("class", "addingRow");
        $row.setAttribute("data-sked", identifier);
        $row.setAttribute("rowspan", "2");
        var cols = ["", "", "", ""];
        cols.forEach((a, index) => {
          cols[index] = document.createElement("td");
          $row.appendChild(cols[index]);
        });
        cols[0].innerHTML = "<input class='tagifyableName addingField' id='" + sanitize(identifier) + "-add-name' type='text' placeholder='Name'/>";
        cols[1].innerHTML = "<input class='form-control' id='" + sanitize(identifier) + "-add-start' type='time' value='" + lastClass.end + "'/>";
        cols[2].innerHTML = "<input class='form-control addingField' id='" + sanitize(identifier) + "-add-end' type='time' />";
        cols[3].innerHTML = "<button type='submit' class='btn btn-success form-control' onclick='addSkedRow(\"" + sanitize(identifier) + "\", \"" + sanitize(lcLabel) + "\")'>Add</button>";
        $tbody.appendChild($row);
      })();

      return $container;
    };

    var tagifies = [];

    var tagifyWhitelist = [];

    firebase.database().ref("schools/" + window.identifier + "/symbols").on("value", (snapshot) => {
      if (!snapshot.val()) return;

      if (snapshot.val() != null) symbols = snapshot.val();

      var values = [];
      for (key in symbols) {
        values.push({
          value: symbols[key].value,
          key: key
        });
      }

      tagifyWhitelist = values;


      tagifies.forEach((tagify) => {
        tagify.settings.whitelist = values;
      });
    });



    firebase.database().ref("schools/" + identifier + "/schedules").on("value", (snapshot) => {
      if (!snapshot.val()) return;

      firebase.database().ref("schools/" + identifier + "/symbols").once("value").then((sS) => {
        symbols = (sS.val() != null ? sS.val() : {});
        var schedules = snapshot.val();

        $skedList.innerHTML = "";

        for (schedule_ in schedules) {
          var identifier = schedule_;
          var name;
          var periods = [];
          for (child in schedules[schedule_]) {
            if (child == "name") {
              name = schedules[schedule_][child];
              continue;
            } else if (child == "hidden") continue;
            periods[child] = schedules[schedule_][child];
          }
          if (schedules[schedule_].hidden != null && schedules[schedule_].hidden == true) continue;
          $skedList.appendChild(renderTable(identifier, name, periods));

        }

        $skedList.innerHTML += "<li id='addSchedule-row' class='list-group-item'>\
        <h5>Create Schedule</h5>\
        <form class='form-row' id='addSchedule-form'>\
        <div class='col-sm-10 form-group'>\
        <input type='text' id='addSchedule-name' required placeholder='Name' class='form-control'/>\
        </div>\
        <div class='col form-group'>\
          <button class='btn btn-success form-control'>Add</button>\
        </div>\
        </form></li>";

        tagifies = [];
        window.tagifies = tagifies;
        [].slice.call(document.getElementsByClassName("tagifyableName")).forEach(($el) => {
          var t = new Tagify($el, {
            enforceWhitelist: true,
            keepInvalidTags: true,
            mapValueToProp: "key",
            templates: {
              tag: function(v, tagData) {
                try {
                  return `<tag title='${v}' contenteditable='false' spellcheck="false" class='tagify__tag ${tagData.class ? tagData.class : ""}' ${this.getAttributes(tagData)}>
                           <div>
                               <span class='tagify__tag-text'>${v}</span>
                           </div>
                       </tag>`;
                } catch (err) {}
              }
            },
            whitelist: tagifyWhitelist,
            delimiters: ","
          });
          t.on('invalid', function(e) {
            var value = e.detail.data.value;
            addSymbol(e.detail.data.value).then((snapshot) => {
              var tag = t.DOM.scope.children[e.detail.index];
              t.removeTag(tag);
              t.addTags([{
                key: snapshot.key,
                value: value
              }]);
            });
          });
          var tagifyIndex = tagifies.length;
          $el.setAttribute("data-tagifyIndex", tagifyIndex);
          tagifies.push(t);
        });

        document.getElementById('addSchedule-form').onsubmit = (e) => {
          e.preventDefault();
          var scheduleName = document.getElementById('addSchedule-name').value;
          if (scheduleName.trim() == "") {
            return document.getElementById('addSchedule-row').classList.add("list-group-item-danger");
          }
          firebase.database().ref("schools/" + window.identifier + "/schedules").push({
            name: scheduleName
          });
        };
        var saveSkedRow = function(sIdentifier, id, lastID) {
          var $row = document.getElementById(sIdentifier + "-row-" + id);
          var start = document.getElementById(sIdentifier + "-" + id + "-start").value;
          var end = document.getElementById(sIdentifier + "-" + id + "-end").value;
          var nameRel = document.getElementById(sIdentifier + "-" + id + "-name").getAttribute("data-tagifyIndex");
          var nameEls = tagifies[parseInt(nameRel)].value;

          var nameBits = [];

          nameEls.forEach((nameEl) => {
            nameBits.push("$(" + nameEl.key + ")");
          });

          var name = nameBits.join(" ");

          var anyAreEmpty = false;
          [start, end, name].forEach((a) => {
            if (a.trim() == "") {
              anyAreEmpty = true;
              console.log(id + "; e m p t y");
              $row.setAttribute("class", "table-danger");
            } else {
              if($row.getAttribute("class") && $row.getAttribute("class").indexOf("table-danger") != -1) {
                $row.setAttribute("class", $row.getAttribute("class").split("table-danger").join(""));
              }
            }
          });
          if (anyAreEmpty) return;

          if (lastID != "") {
            var lastClass = schedules[sIdentifier][lastID];
            var testStartDate = new Date();
            var testEndDate = new Date();
            testStartDate.setHours(start.split(":")[0]);
            testStartDate.setMinutes(start.split(":")[1]);
            testEndDate.setHours(lastClass.end.split(":")[0]);
            testEndDate.setMinutes(lastClass.end.split(":")[1]);
            if (testEndDate > testStartDate) {
              console.log(id + "; starts after last period end");
              $row.setAttribute("class", "table-danger");
              return;
            }

            testEndDate.setHours(end.split(":")[0]);
            testEndDate.setMinutes(end.split(":")[1]);

            if (testEndDate < testStartDate) {
              console.log(id + "; ends after starts");
              $row.setAttribute("class", "table-danger");
              return;
            }
          }

          var path = "schools/" + window.identifier + "/schedules/" + sIdentifier + "/" + id;

          var obj = {
            start: start,
            end: end,
            name: name
          };

          return {
            path: path,
            payload: obj
          };
        };

        window.saveAllSkeds = function(sIdentifier) {
          var schedule = schedules[sIdentifier];

          var addingRows = document.getElementsByClassName("addingRow");
          for (var addingRowIndex = 0; addingRowIndex < addingRows.length; addingRowIndex++) {
            var row = addingRows[addingRowIndex];
            console.log(row);
            if(typeof row != "object") continue;
            var skedID = row.getAttribute("data-sked");
            var addNameID = skedID + "-add-name";
            var endTimeID = skedID + "-add-end";
            var toBreak = false;
            [addNameID, endTimeID].forEach((fieldID) => {
              var field = document.getElementById(fieldID);
              if (field.value != "" && field.value != undefined && field.value != "[]") {
                console.log(fieldID, field.value);
                toBreak = true;
              }
            });
            if (toBreak) {
              return;
            }
          }

          var keys = [];
          for (s in schedule) {
            if (s == "name" || s == "hidden") continue;
            keys.push(s);
          }

          var operations = [];

          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var lastID = (i == 0 ? "" : keys[i - 1]);
            var operation = saveSkedRow(sIdentifier, key, lastID);
            if (!operation) {
              return;
            }
            operations.push(operation);
          }

          operations.forEach((operation) => {
            if (!operation) {
              return;
            }
            firebase.database().ref(operation.path).set(operation.payload);
          });

        };

        window.renameSchedule = (sIdent) => {
          saveAllSkeds();
          var newName = prompt("Please enter the new schedule name.");
          if (newName == null) return;
          firebase.database().ref("schools/" + window.identifier + "/schedules/" + sIdent + "/name").set(newName);
        };
        window.duplicateSchedule = (sIdent) => {
          saveAllSkeds();
          firebase.database().ref("schools/" + window.identifier + "/schedules/" + sIdent).once("value").then((s) => {
            if (s.val() == null) return;

            var newSked = s.val();
            newSked.name = newSked.name + " copy";
            firebase.database().ref("schools/" + window.identifier + "/schedules").push(newSked);
          });
        };
        window.deleteSchedule = (sIdent) => {
          saveAllSkeds();
          firebase.database().ref("schools/" + window.identifier + "/schedules/" + sIdent).once("value").then((s) => {
            if (!s.val()) return;
            var keys = [];
            for (key in s.val()) {
              if (key != "hidden" && key != "name") keys.push(key);
            }
            var confirmation = true;
            if (keys.length > 0) {
              confirmation = false;
              confirmation = confirm("Are you sure you'd like to delete the schedule?");
            }
            if (confirmation) {
              firebase.database().ref("schools/" + window.identifier + "/schedules/" + sIdent + "/hidden").set(true);
            }
          });
        }
        window.addSkedRow = function(sIdent, lastID) {
          var start = document.getElementById(sIdent + "-add-start").value;
          var end = document.getElementById(sIdent + "-add-end").value;
          var name = document.getElementById(sIdent + "-add-name").value;
          var $row = document.getElementById(sIdent + "-toAddRow");

          var anyAreEmpty = false;
          [start, end, name].forEach((a) => {
            if (!a || a == "") {
              anyAreEmpty = true;
              $row.setAttribute("class", "table-danger");
            }
          });
          if (anyAreEmpty) return;
          if (lastID != "") {
            var lastClass = schedules[sIdent][lastID];
            var testStartDate = new Date();
            var testEndDate = new Date();
            testStartDate.setHours(start.split(":")[0]);
            testStartDate.setMinutes(start.split(":")[1]);
            testEndDate.setHours(lastClass.end.split(":")[0]);
            testEndDate.setMinutes(lastClass.end.split(":")[1]);
            if (testEndDate > testStartDate) {
              $row.setAttribute("class", "table-danger");
              return;
            }
          }

          var path = "schools/" + window.identifier + "/schedules/" + sIdent + "/";

          var obj = {
            start: start,
            end: end,
            name: name
          };

          var failed = false;
          firebase.database().ref(path).push(obj).catch(() => {
            failed = true;
            $row.setAttribute("class", "table-danger");
          }).then(() => {
            if (!failed) {
              $row.setAttribute("class", "");
            }
          });

        };
        window.deleteSkedRow = function(sIdent, id, lastID, nextID) {
          //symbols = symbolsS.val() == null ? {} : symbolsS.val();
          var path = "schools/" + window.identifier + "/schedules/" + sIdent + "/" + id;
          var name = schedules[sIdent][id].name;
          for (symbol in symbols) {
            name = name.split("$(" + symbol + ")").join(symbols[symbol].value);
          }
          if (window.confirm("Are you sure you'd like to delete the period " + name + "?")) {
            firebase.database().ref(path).set(null);
          }
        };
        window.insertRowAfter = function(classRow, pClassKey, sIdent) {
          var newKey = pClassKey + "a";
          var start = schedules[sIdent][pClassKey].end;
          var end = schedules[sIdent][classRow].start;
          var name = "Inserted class";
          var obj = {
            start: start,
            end: end,
            name: name
          }
          var path = "schools/" + window.identifier + "/schedules/" + sIdent + "/" + newKey;
          firebase.database().ref(path).set(obj);
        };
      });


    });

  })();

  (() => {
    var $symbolsElement = document.getElementById("panel-symbolList");
    var symbolsAreHidden = false;
    window.toggleSymbols = () => {
      symbolsAreHidden = !symbolsAreHidden;
      if (symbolsAreHidden) {
        $symbolsElement.style.display = "none";
      } else {
        $symbolsElement.style.display = "block";
      }
    }
    toggleSymbols();
    var renderSymbolsTable = function(symbols) {
      var keys = [];
      for (a in symbols) {
        keys.push(a);
      }
      var output = "";
      keys.forEach((key) => {
        var $symbolElement = document.createElement("li");
        $symbolElement.setAttribute("class", "symbolElement list-group-item container");
        $symbolElement.innerHTML = "<div class='form-row' id='symbol-" + sanitize(key) + "-row'>\
      <div class='col'>" + sanitize(symbols[key].value) + "</div>\
      <div class='custom-control custom-switch'> <input type='checkbox' " + (symbols[key].configurable ? "checked" : "") + " onchange='updateConfigurable(\"" + sanitize(key) + "\")' class='custom-control-input' id='symbol-" + sanitize(key) + "-configurable'><label title='Configurable?' class='custom-control-label' for='symbol-" + sanitize(key) + "-configurable'></label></div>\
      <div class='col-sm-4'><button class='btn btn-danger form-control' onclick='deleteSymbol(\"" + sanitize(key) + "\")'>Delete</button><div>\
      </div>";
        output += $symbolElement.outerHTML;
      });
      (() => {
        var $symbolElement = document.createElement("li");
        $symbolElement.setAttribute("class", "symbolElement list-group-item container");
        $symbolElement.innerHTML = "<form id='addSymbol-row' class='form-row'>\
      <div class='col'><input type='text' id='addSymbol-text' class='form-control'></div>\
      <div class='custom-control custom-switch'> <input type='checkbox' class='custom-control-input' id='addSymbol-configurable'><label title='Configurable?' class='custom-control-label' for='addSymbol-configurable'></label></div>\
      <div class='col-sm-4'><button type='submit' class='btn btn-success form-control' >Add</button><div>\
      </form>"
        output += $symbolElement.outerHTML;
      })();
      return output;
    }
    firebase.database().ref("schools/" + window.identifier + "/symbols").on("value", (snapshot) => {
      var symbols = {};
      if (snapshot.val() != null) {
        symbols = snapshot.val();
      }
      $symbolsElement.innerHTML = renderSymbolsTable(symbols);

      document.getElementById("addSymbol-row").onsubmit = (e) => {
        e.preventDefault();
        var symbolText = document.getElementById("addSymbol-text").value;
        var configurable = document.getElementById("addSymbol-configurable").checked;
        if (symbolText.trim() == "") {
          document.getElementById("addSymbol-row").parentNode.classList.add("list-group-item-danger");
          return;
        }
        firebase.database().ref("schools/" + window.identifier + "/symbols").push({
          value: symbolText,
          configurable: configurable
        });
      };
      window.updateConfigurable = function(key) {
        var configurable = document.getElementById('symbol-' + key + '-configurable').checked;
        firebase.database().ref("schools/" + window.identifier + "/symbols/" + key + "/configurable").set(configurable);
      }
      window.deleteSymbol = function(key) {
        firebase.database().ref("schools/" + window.identifier + "/schedules").once("value", (snapshot) => {
          if (!snapshot.val()) return;

          var schedules = snapshot.val();

          var hasUsage = false;

          var usages = [];
          for (schedule in schedules) {
            for (period in schedules[schedule]) {
              if (period == "name" || period == "hidden") continue;
              if (schedules[schedule][period].name.indexOf("$(" + key + ")") != -1) {
                hasUsage = true;
                usages.push({
                  schedule: schedule,
                  period: period
                });
              }
            }
          }

          var confirmation = true;
          if (hasUsage) {
            confirmation = confirm("Would you like to delete the symbol " + symbols[key].value + "? This may break your schedules.");
          }
          if (confirmation) {
            var failedDelete = false;
            firebase.database().ref("schools/" + window.identifier + "/symbols/" + key).set(null).catch(() => {
              failedDelete = true;
            }).then(() => {
              if (failedDelete) return;

              usages.forEach((usage) => {
                firebase.database().ref("schools/" + window.identifier + "/schedules/" + usage.schedule + "/" + usage.period + "/name").once("value").then((s) => {
                  if (!s.val()) return;
                  firebase.database().ref("schools/" + window.identifier + "/schedules/" + usage.schedule + "/" + usage.period + "/name").set(s.val().split("$(" + key + ")").join(""));

                });
              });
            });
          }
        });
      };

    });
    window.addSymbol = (symbolText) => {
      return new Promise((resolve, reject) => {
        firebase.database().ref("schools/" + window.identifier + "/symbols").push({
          value: symbolText,
          configurable: false
        }).catch(reject).then(resolve);
      });
    };
  })();

  (() => {
    var $configurationsEl = document.getElementById("panel-configurationList");
    window.wkDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    window.wkDayLabels = ["sun", "mon", "tues", "wed", "thurs", "fri", "sat"];
    var renderConfigurations = (configurations) => {
      $configurationsEl.innerHTML = "";
      (() => {
        var weekConfigs = configurations.week || {};
        for (var i = 0; i < wkDays.length; i++) {
          var $wkDay = document.createElement("li");
          var wkDay = wkDays[i];
          var wkDayLabel = wkDayLabels[i];
          $wkDay.setAttribute("class", "list-group-item " + (i == 0 || i == 6 ? "list-group-item-secondary" : "list-group-item-primary"));
          $wkDay.innerHTML = "<form><div class='form-group row'><label class='col-sm-3 col-form-label' for='select-week-" + wkDayLabel + "'>" + wkDay + "</label>\
          <div class='col-sm-6'><select onchange='commitWeekChange(\"" + wkDayLabel + "\")' data-sked='" + (weekConfigs[wkDayLabel] ? weekConfigs[wkDayLabel] : "null") + "' class='form-control weekConfigurationSelect' id='select-week-" + wkDayLabel + "' class='form-control col-10'></select></div></div></form>"
          $configurationsEl.appendChild($wkDay);
        }
      })();
      (() => {
        var specialConfigs = configurations.special || {};
        for (key in specialConfigs) {
          var config = specialConfigs[key];
          var date = config.date;
          var value = config.value;

          var $day = document.createElement("li");
          $day.setAttribute("class", "list-group-item");
          $day.innerHTML = "<div class='form-group row'><div class='col-sm-3'><input onblur='commitSpecialChange(\"" + sanitize(key) + "\")' id='date-special-" + sanitize(key) + "' type='date' value='" + sanitize(date) + "' class='form-control'/></div>\
          <div class='col-sm-6'><select onchange='commitSpecialChange(\"" + sanitize(key) + "\")' data-sked='" + sanitize(value) + "' class='form-control configurationSelect' id='select-special-" + key + "' class='form-control'></select>\
          </div><div class='col-sm-3'><button onclick='deleteSpecialSchedule(\"" + sanitize(key) + "\")' class='btn btn-outline-danger form-control'>Delete</button></div></div>"
          $configurationsEl.appendChild($day);
        }
      })();
      (() => {
        var $add = document.createElement("li");
        $add.setAttribute("class", "list-group-item");
        $add.setAttribute("id", "row-add-special");
        $add.innerHTML = "<form id='form-add'><div class='form-group row'><div class='col-sm-3'><input id='date-add' type='date' class='form-control'/></div>\
          <div class='col-sm-6'><select class='form-control configurationSelect' id='select-add' class='form-control'></select></div><div class='col-sm-3'><button class='form-control btn btn-success' type='submit'>Add</button></div></div></form>"
        $configurationsEl.appendChild($add);
      })();
    };
    firebase.database().ref("schools/" + window.identifier + "/configurations").on("value", (configurationsS) => {

      var configurations = configurationsS.val() != null ? configurationsS.val() : {};

      renderCalendarString();

      renderConfigurations(configurations);

      document.getElementById("form-add").onsubmit = (e) => {
        e.preventDefault();
        var date = document.getElementById("date-add").value;
        var value = document.getElementById("select-add").value;
        if (date == null || date == "" || value == null || value == "null") {
          return document.getElementById("row-add-special").classList.add("list-group-item-danger");
        }
        firebase.database().ref("schools/" + window.identifier + "/configurations/special").push({
          date: date,
          value: value
        });
      };

      window.commitWeekChange = (wDayLabel) => {
        var $select = document.getElementById("select-week-" + wDayLabel);
        var value = $select.value == "null" ? null : $select.value;
        firebase.database().ref("schools/" + window.identifier + "/configurations/week/" + wDayLabel).set(value);
      };

      window.commitSpecialChange = (path) => {
        var select = document.getElementById("select-special-" + path).value;
        var date = document.getElementById("date-special-" + path).value;
        if (date == null || date == "" || select == null || select == "null") {
          return document.getElementById("row-add-special").classList.add("list-group-item-danger");
        }
        firebase.database().ref("schools/" + window.identifier + "/configurations/special/" + path).set({
          date: date,
          value: select
        });
      };

      window.deleteSpecialSchedule = (path) => {
        if (confirm("Are you sure you'd like to delete the special schedule for " + configurations.special[path].date + "?")) {
          firebase.database().ref("schools/" + window.identifier + "/configurations/special/" + path).set(null);
        }
      };


      firebase.database().ref("schools/" + window.identifier + "/schedules").on("value", (schedulesS) => {
        var schedules = schedulesS.val() != null ? schedulesS.val() : {};
        var scheduleArr = [];
        for (scheduleKey in schedules) {
          var scheduleName = schedules[scheduleKey].name;
          var o = {
            name: scheduleName,
            value: scheduleKey
          };
          if (schedules[scheduleKey].hidden) o.hidden = true;
          scheduleArr.push(o);
        }
        scheduleArr.splice(0, 0, {
          value: "null",
          name: ""
        });
        [].slice.call(document.getElementsByClassName("weekConfigurationSelect")).forEach((select) => {
          var options = scheduleArr.map((schedule) => {
            if (schedule.hidden && select.getAttribute("data-sked") != schedule.value) return "";
            return "<option " + (select.getAttribute("data-sked") == schedule.value ? "selected" : "") + " value='" + sanitize(schedule.value) + "'>" + sanitize(schedule.name) + "</option>";
          }).join("");
          select.innerHTML = options;
        });
        scheduleArr.splice(0, 1);
        [].slice.call(document.getElementsByClassName("configurationSelect")).forEach((select) => {
          var options = scheduleArr.map((schedule) => {
            if (schedule.hidden && select.getAttribute("data-sked") != schedule.value) return "";
            return "<option " + (select.getAttribute("data-sked") == schedule.value ? "selected" : "") + " value='" + sanitize(schedule.value) + "'>" + sanitize(schedule.name) + "</option>";
          }).join("");
          select.innerHTML = options;
        });
      });
    });
  })();
  (() => {
    window.renderCalendarString = () => {
      return new Promise((resolve, reject) => {
        firebase.database().ref("schools/" + window.identifier + "/configurations").once("value").then((configurationsS) => {
          var configurations = configurationsS.val() || {};
          var spConfigurations = configurations.special || {};
          var configurationDates = {};
          for (configKey in spConfigurations) {
            configurationDates[spConfigurations[configKey].date] = spConfigurations[configKey].value;
          }
          firebase.database().ref("schools/" + window.identifier + "/calendars/bounds").once("value").then((boundsS) => {
            var bounds = boundsS.val();
            if (bounds == null) return reject();
            var dayMillis = 1000 * 60 * 60 * 24;
            var numDays = ((bounds.end - bounds.start) / dayMillis) + 1;
            var date = new Date(bounds.start);
            var months = {};
            for (var day = 0; day < numDays; day++) {
              date.setTime(date.getTime() + dayMillis);
              var y = date.getFullYear() + "";
              var m = date.getMonth() + 1;
              m < 10 ? m = "0" + m : m = "" + m;
              var d = date.getDate();
              d < 10 ? d = "0" + d : d = "" + d;
              console.log(m);
              console.log(d);
              var dateString = y + "-" + m + "-" + d;
              if (configurationDates[dateString] != null) {
                months[y + "-" + m] = months[y + "-" + m] != null ? months[y + "-" + m] : {};
                months[y + "-" + m][date.getDate()] = configurationDates[dateString];
              } else {
                var dayOfWeek = date.getDay();
                var wkDayLabel = wkDayLabels[dayOfWeek];
                var sked = (configurations.week || {})[wkDayLabel];
                console.log(dayOfWeek, wkDayLabel, sked);
                console.log(sked == null);
                if (sked == null) continue;
                months[y + "-" + m] = months[y + "-" + m] != null ? months[y + "-" + m] : {};
                months[y + "-" + m][date.getDate()] = sked;
              }
            }
            for (month in months) {
              var year = month.split("-")[0];
              var m = month.split("-")[1];
              var date = new Date();
              date.setDate(1);
              date.setYear(year);
              date.setMonth(parseInt(m) - 1);
              date.setHours(0);
              date.setMinutes(0);
              date.setSeconds(0);
              date.setMilliseconds(0);
              var n = window.daysInMonth(date);
              var path = "schools/" + window.identifier + "/calendars/" + year + "/" + m;
              var strPts = [];
              for (var i = 0; i <= n; i++) {
                strPts.push(months[month][i] == null ? "" : months[month][i]);
              }
              var str = strPts.join(",");
              firebase.database().ref(path).set(str);
            }
            console.log(months);

          });
        });
      });
    };
  })();
  delete readyToLoad;
};

//Global functions
(() => {
  window.sanitize = (text) => {
    var el = document.createElement("div");
    el.innerText = text;
    var sanitized = el.innerHTML;
    delete el;
    return sanitized;
  };
  window.daysInMonth = function(anyDateInMonth) {
    return new Date(anyDateInMonth.getFullYear(),
      anyDateInMonth.getMonth() + 1,
      0).getDate();
  }
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      var uid = user.uid;
      console.log(uid);
      firebase.database().ref("users/" + uid).once("value").then((snapshot) => {
        if (!snapshot.val()) location.assign("..");
        window.identifier = snapshot.val().school != null ? snapshot.val().school : location.assign("..");
        readyToLoad();
      });
    } else {
      location.assign("..");
    }
  });
})();

(() => {
  var advancedConfigShow = true;
  var $advConfigPanel =     document.getElementById("panel-advancedConfig");

  window.toggleAdvancedConfiguration = function() {
    advancedConfigShow = !advancedConfigShow;
    if(advancedConfigShow) {
      $advConfigPanel.style.display = "block";
    } else {
      $advConfigPanel.style.display = "none";
    }
  }

  toggleAdvancedConfiguration();
})();
