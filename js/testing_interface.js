
// Internal state.
var CURRENT_INPUT_GRID = new Grid(3, 3);
var CURRENT_OUTPUT_GRID = new Grid(3, 3);
var TEST_PAIRS = new Array();
var CURRENT_TEST_PAIR_INDEX = 0;
var COPY_PASTE_DATA = new Array();

// Cosmetic.
var EDITION_GRID_HEIGHT = 500;
var EDITION_GRID_WIDTH = 500;
var MAX_CELL_SIZE = 100;

var taskMapping = {
    "6f8cd79b.json": { level: 1, task: 1 },
    "97999447.json": { level: 1, task: 2 },
    "913fb3ed.json": { level: 1, task: 3 },
    "a61f2674.json": { level: 2, task: 1 },
    "08ed6ac7.json": { level: 2, task: 2 },
    "db3e9e38.json": { level: 2, task: 3 },
    "a5f85a15.json": { level: 3, task: 1 },
    "af902bf9.json": { level: 3, task: 2 },
    "623ea044.json": { level: 3, task: 3 },
    "178fcbfb.json": { level: 4, task: 1 },
    "776ffc46.json": { level: 4, task: 2 },
    "f76d97a5.json": { level: 4, task: 3 }
};

$(document).ready(function () {
    localStorage.setItem('currentTaskIndex', 0);
    // Call the randomTask() function to load a random task when the page loads.
    randomTask();

    // The rest of your existing document ready code...
    $('#symbol_picker').find('.symbol_preview').click(function(event) {
        // ...
    });
});

function resetTask() {
    CURRENT_INPUT_GRID = new Grid(3, 3);
    TEST_PAIRS = new Array();
    CURRENT_TEST_PAIR_INDEX = 0;
    $('#task_preview').html('');
    resetOutputGrid();
}

function refreshEditionGrid(jqGrid, dataGrid) {
    fillJqGridWithData(jqGrid, dataGrid);
    setUpEditionGridListeners(jqGrid);
    fitCellsToContainer(jqGrid, dataGrid.height, dataGrid.width, EDITION_GRID_HEIGHT, EDITION_GRID_HEIGHT);
    initializeSelectable();
}

function syncFromEditionGridToDataGrid() {
    copyJqGridToDataGrid($('#output_grid .edition_grid'), CURRENT_OUTPUT_GRID);
}

function syncFromDataGridToEditionGrid() {
    refreshEditionGrid($('#output_grid .edition_grid'), CURRENT_OUTPUT_GRID);
}

function getSelectedSymbol() {
    selected = $('#symbol_picker .selected-symbol-preview')[0];
    return $(selected).attr('symbol');
}

function setUpEditionGridListeners(jqGrid) {
    jqGrid.find('.cell').click(function(event) {
        cell = $(event.target);
        symbol = getSelectedSymbol();

        mode = $('input[name=tool_switching]:checked').val();
        if (mode == 'floodfill') {
            // If floodfill: fill all connected cells.
            syncFromEditionGridToDataGrid();
            grid = CURRENT_OUTPUT_GRID.grid;
            floodfillFromLocation(grid, cell.attr('x'), cell.attr('y'), symbol);
            syncFromDataGridToEditionGrid();
        }
        else if (mode == 'edit') {
            // Else: fill just this cell.
            setCellSymbol(cell, symbol);
        }
    });
}

function resizeOutputGrid() {
    size = $('#output_grid_size').val();
    size = parseSizeTuple(size);
    height = size[0];
    width = size[1];

    jqGrid = $('#output_grid .edition_grid');
    syncFromEditionGridToDataGrid();
    dataGrid = JSON.parse(JSON.stringify(CURRENT_OUTPUT_GRID.grid));
    CURRENT_OUTPUT_GRID = new Grid(height, width, dataGrid);
    refreshEditionGrid(jqGrid, CURRENT_OUTPUT_GRID);
}

function resetOutputGrid() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = new Grid(3, 3);
    syncFromDataGridToEditionGrid();
    resizeOutputGrid();
}

function copyFromInput() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(CURRENT_INPUT_GRID.grid);
    syncFromDataGridToEditionGrid();
    $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height + 'x' + CURRENT_OUTPUT_GRID.width);
}

function fillPairPreview(pairId, inputGrid, outputGrid) {
    var pairSlot = $('#pair_preview_' + pairId);
    if (!pairSlot.length) {
        // Create HTML for pair.
        pairSlot = $('<div id="pair_preview_' + pairId + '" class="pair_preview" index="' + pairId + '"></div>');
        pairSlot.appendTo('#task_preview');
    }
    var jqInputGrid = pairSlot.find('.input_preview');
    if (!jqInputGrid.length) {
        jqInputGrid = $('<div class="input_preview"></div>');
        jqInputGrid.appendTo(pairSlot);
    }
    var jqOutputGrid = pairSlot.find('.output_preview');
    if (!jqOutputGrid.length) {
        jqOutputGrid = $('<div class="output_preview"></div>');
        jqOutputGrid.appendTo(pairSlot);
    }

    fillJqGridWithData(jqInputGrid, inputGrid);
    fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width, 200, 200);
    fillJqGridWithData(jqOutputGrid, outputGrid);
    fitCellsToContainer(jqOutputGrid, outputGrid.height, outputGrid.width, 200, 200);
}

function loadJSONTask(train, test) {
    resetTask();
    $('#modal_bg').hide();
    $('#error_display').hide();
    $('#info_display').hide();

    for (var i = 0; i < train.length; i++) {
        pair = train[i];
        values = pair['input'];
        input_grid = convertSerializedGridToGridObject(values)
        values = pair['output'];
        output_grid = convertSerializedGridToGridObject(values)
        fillPairPreview(i, input_grid, output_grid);
    }
    for (var i=0; i < test.length; i++) {
        pair = test[i];
        TEST_PAIRS.push(pair);
    }
    values = TEST_PAIRS[0]['input'];
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(values)
    fillTestInput(CURRENT_INPUT_GRID);
    CURRENT_TEST_PAIR_INDEX = 0;
    $('#current_test_input_id_display').html('1');
    $('#total_test_input_count_display').html(test.length);
}

function display_task_name(task_name) {
    var big_space = '&nbsp;'.repeat(2);
    if (taskMapping[task_name]) {
        var level = taskMapping[task_name].level;
        var taskNumber = taskMapping[task_name].task;

        document.getElementById('task_name').innerHTML = (
            'Level:' + big_space + level + big_space + big_space + 'Task:' + big_space + taskNumber
        );
    } else {
        document.getElementById('task_name').innerHTML = 'Task not found';
    }
}

function loadTaskFromFile(e) {
    var file = e.target.files[0];
    if (!file) {
        errorMsg('No file selected');
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;

        try {
            contents = JSON.parse(contents);
            train = contents['train'];
            test = contents['test'];
        } catch (e) {
            errorMsg('Bad file format');
            return;
        }
        loadJSONTask(train, test);

        $('#load_task_file_input')[0].value = "";
        display_task_name(file.name, null, null);
    };
    reader.readAsText(file);
}

function randomTask() {
    var subset = "training"; // Set the subset directory
    var taskNames = [
        "6f8cd79b.json", "97999447.json", "913fb3ed.json",
        "a61f2674.json", "08ed6ac7.json", "db3e9e38.json",
        "a5f85a15.json", "af902bf9.json", "623ea044.json",
        "178fcbfb.json", "776ffc46.json", "f76d97a5.json", 
    ];

    // Retrieve or initialize the current task index
    var currentIndex = parseInt(localStorage.getItem('currentTaskIndex'), 10);
    if (isNaN(currentIndex)) {
        currentIndex = 0;
    }

    // Get the current task name from the list
    var taskName = taskNames[currentIndex];

    // Make an API call to GitHub to retrieve a list of tasks
    $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, function(tasks) {
        var task = tasks.find(t => t.name === taskName);
        if (!task) {
            errorMsg('Task not found');
            return;
        }

        $.getJSON(task["download_url"], function(json) {
            try {
                var train = json['train'];
                var test = json['test'];
                loadJSONTask(train, test);
                display_task_name(task['name'], tasks.indexOf(task), tasks.length);
            } catch (e) {
                errorMsg('Bad file format');
                return;
            }
        }).error(function() {
            errorMsg('Error loading task');
        });
    }).error(function() {
        errorMsg('Error loading task list');
    });

    // Update the current index in localStorage
    localStorage.setItem('currentTaskIndex', (currentIndex + 1) % taskNames.length);
}



// function randomTask() {
//     var subset = "training"; // Set the subset directory, e.g., "training"
//     // Define a list of specific task names
//     var taskNames = [
//         "22eb0ac0.json", "007bbfb7.json",
//     ];
//     // Randomly select a task name from the list
//     var taskName = taskNames[Math.floor(Math.random() * taskNames.length)];

//     // Make an API call to GitHub to retrieve a list of tasks in the specified subset
//     $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, function(tasks) {
//         // Find the task by name
//         var task = tasks.find(t => t.name === taskName);
//         if (!task) {
//             errorMsg('Task not found'); // Display an error message if the task is not found
//             return;
//         }

//         // Make an API call to download the task data using the download URL provided
//         $.getJSON(task["download_url"], function(json) {
//             try {
//                 // Attempt to parse the training and testing data
//                 var train = json['train'];
//                 var test = json['test'];
//                 loadJSONTask(train, test); // Load the task with the parsed data
//                 infoMsg("Loaded task training/" + task["name"]); // Display a success message
//                 display_task_name(task['name'], tasks.indexOf(task), tasks.length); // Update the UI to show task details
//             } catch (e) {
//                 errorMsg('Bad file format'); // Error handling for bad JSON format
//                 return;
//             }
//         })
//         .error(function(){
//           errorMsg('Error loading task'); // Error handling if the task data fails to load
//         });
//     })
//     .error(function(){
//       errorMsg('Error loading task list'); // Error handling if the initial list of tasks fails to load
//     });
// }


// function randomTask() {
//     var subset = "training"; // Set the subset directory, e.g., "training"
//     var taskName = "22eb0ac0.json"; // Define the specific task name to load

//     // Make an API call to GitHub to retrieve a list of tasks in the specified subset
//     $.getJSON("https://api.github.com/repos/fchollet/ARC/contents/data/" + subset, function(tasks) {
//         // Find the task by name
//         var task = tasks.find(t => t.name === taskName);
//         if (!task) {
//             errorMsg('Task not found'); // Display an error message if the task is not found
//             return;
//         }

//         // Make an API call to download the task data using the download URL provided
//         $.getJSON(task["download_url"], function(json) {
//             try {
//                 // Attempt to parse the training and testing data
//                 var train = json['train'];
//                 var test = json['test'];
//                 loadJSONTask(train, test); // Load the task with the parsed data
//                 infoMsg("Loaded task training/" + task["name"]); // Display a success message
//                 display_task_name(task['name'], tasks.indexOf(task), tasks.length); // Update the UI to show task details
//             } catch (e) {
//                 errorMsg('Bad file format'); // Error handling for bad JSON format
//                 return;
//             }
//         })
//         .error(function(){
//           errorMsg('Error loading task'); // Error handling if the task data fails to load
//         });
//     })
//     .error(function(){
//       errorMsg('Error loading task list'); // Error handling if the initial list of tasks fails to load
//     });
// }

function nextTestInput() {
    if (TEST_PAIRS.length <= CURRENT_TEST_PAIR_INDEX + 1) {
        errorMsg('No next test input. Pick another file?')
        return
    }
    CURRENT_TEST_PAIR_INDEX += 1;
    values = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['input'];
    CURRENT_INPUT_GRID = convertSerializedGridToGridObject(values)
    fillTestInput(CURRENT_INPUT_GRID);
    $('#current_test_input_id_display').html(CURRENT_TEST_PAIR_INDEX + 1);
    $('#total_test_input_count_display').html(test.length);
}

function submitSolution() {
    syncFromEditionGridToDataGrid();
    reference_output = TEST_PAIRS[CURRENT_TEST_PAIR_INDEX]['output'];
    submitted_output = CURRENT_OUTPUT_GRID.grid;
    if (reference_output.length != submitted_output.length) {
        errorMsg('Wrong solution.');
        return
    }
    for (var i = 0; i < reference_output.length; i++){
        ref_row = reference_output[i];
        for (var j = 0; j < ref_row.length; j++){
            if (ref_row[j] != submitted_output[i][j]) {
                errorMsg('Wrong solution.(');
                return
            }
        }

    }
    infoMsg('Correct solution!');
}

function fillTestInput(inputGrid) {
    jqInputGrid = $('#evaluation_input');
    fillJqGridWithData(jqInputGrid, inputGrid);
    fitCellsToContainer(jqInputGrid, inputGrid.height, inputGrid.width, 400, 400);
}

function copyToOutput() {
    syncFromEditionGridToDataGrid();
    CURRENT_OUTPUT_GRID = convertSerializedGridToGridObject(CURRENT_INPUT_GRID.grid);
    syncFromDataGridToEditionGrid();
    $('#output_grid_size').val(CURRENT_OUTPUT_GRID.height + 'x' + CURRENT_OUTPUT_GRID.width);
}

function initializeSelectable() {
    try {
        $('.selectable_grid').selectable('destroy');
    }
    catch (e) {
    }
    toolMode = $('input[name=tool_switching]:checked').val();
    if (toolMode == 'select') {
        // infoMsg('Select some cells and click on a color to fill in, or press C to copy');
        $('.selectable_grid').selectable(
            {
                autoRefresh: false,
                filter: '> .row > .cell',
                start: function(event, ui) {
                    $('.ui-selected').each(function(i, e) {
                        $(e).removeClass('ui-selected');
                    });
                }
            }
        );
    }
}

// Initial event binding.

$(document).ready(function () {
    $('#symbol_picker').find('.symbol_preview').click(function(event) {
        symbol_preview = $(event.target);
        $('#symbol_picker').find('.symbol_preview').each(function(i, preview) {
            $(preview).removeClass('selected-symbol-preview');
        })
        symbol_preview.addClass('selected-symbol-preview');

        toolMode = $('input[name=tool_switching]:checked').val();
        if (toolMode == 'select') {
            $('.edition_grid').find('.ui-selected').each(function(i, cell) {
                symbol = getSelectedSymbol();
                setCellSymbol($(cell), symbol);
            });
        }
    });

    $('.edition_grid').each(function(i, jqGrid) {
        setUpEditionGridListeners($(jqGrid));
    });

    $('.load_task').on('change', function(event) {
        loadTaskFromFile(event);
    });

    $('.load_task').on('click', function(event) {
      event.target.value = "";
    });

    $('input[type=radio][name=tool_switching]').change(function() {
        initializeSelectable();
    });
    
    $('input[type=text][name=size]').on('keydown', function(event) {
        if (event.keyCode == 13) {
            resizeOutputGrid();
        }
    });

    $('body').keydown(function(event) {
        // Copy and paste functionality.
        if (event.which == 67) {
            // Press C

            selected = $('.ui-selected');
            if (selected.length == 0) {
                return;
            }

            COPY_PASTE_DATA = [];
            for (var i = 0; i < selected.length; i ++) {
                x = parseInt($(selected[i]).attr('x'));
                y = parseInt($(selected[i]).attr('y'));
                symbol = parseInt($(selected[i]).attr('symbol'));
                COPY_PASTE_DATA.push([x, y, symbol]);
            }
            infoMsg('Cells copied! Select a target cell and press V to paste at location.');

        }
        if (event.which == 86) {
            // Press P
            if (COPY_PASTE_DATA.length == 0) {
                errorMsg('No data to paste.');
                return;
            }
            selected = $('.edition_grid').find('.ui-selected');
            if (selected.length == 0) {
                errorMsg('Select a target cell on the output grid.');
                return;
            }

            jqGrid = $(selected.parent().parent()[0]);

            if (selected.length == 1) {
                targetx = parseInt(selected.attr('x'));
                targety = parseInt(selected.attr('y'));

                xs = new Array();
                ys = new Array();
                symbols = new Array();

                for (var i = 0; i < COPY_PASTE_DATA.length; i ++) {
                    xs.push(COPY_PASTE_DATA[i][0]);
                    ys.push(COPY_PASTE_DATA[i][1]);
                    symbols.push(COPY_PASTE_DATA[i][2]);
                }

                minx = Math.min(...xs);
                miny = Math.min(...ys);
                for (var i = 0; i < xs.length; i ++) {
                    x = xs[i];
                    y = ys[i];
                    symbol = symbols[i];
                    newx = x - minx + targetx;
                    newy = y - miny + targety;
                    res = jqGrid.find('[x="' + newx + '"][y="' + newy + '"] ');
                    if (res.length == 1) {
                        cell = $(res[0]);
                        setCellSymbol(cell, symbol);
                    }
                }
            } else {
                errorMsg('Can only paste at a specific location; only select *one* cell as paste destination.');
            }
        }
    });
});


